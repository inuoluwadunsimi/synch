import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { EngineerTasksEnums } from './interface/tasks.responses';
import { BaseQuery } from '../../resources/interfaces';
import { allowedTransitions, TaskStatusEnums } from './interface/tasks.enums';
import { FilterQuery } from 'mongoose';
import { TasksLogsDocument } from './schemas/tasks.logs.schema';
import {
  ChangeTaskStatusRequests,
  CreateNewLog,
} from './interface/tasks.requests';
import { UserRepository } from '../user/user.repository';
import { UserRole } from '../user/interfaces/enums/user.enums';
import { ActivityStatus, UserDocument } from '../user/schemas/user.schema';
import { BankRepository } from '../bank/bank.repository';
import {
  NotificationService,
  SendTextWhatsappMessage,
} from '../notifcation/notification.service';
import { AtmHealthStatus } from '../bank/interfaces/atm.enums';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Secrets } from '../../resources/secrets';
import { ConfigService } from '@nestjs/config';
import { query } from 'express';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private gemini: GoogleGenerativeAI;

  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly userRepository: UserRepository,
    private readonly bankkRepository: BankRepository,
    private readonly notificationService: NotificationService,
    private readonly configService: ConfigService,
  ) {
    this.gemini = new GoogleGenerativeAI(
      this.configService.get<string>(Secrets.GEMINI_API_KEY),
    );
  }

  public async getEngineerTasks(data: {
    user: string;
    status: EngineerTasksEnums;
    query: BaseQuery;
    from?: Date;
    to?: Date;
  }) {
    const { user: userId, status, query, from, to } = data;

    const statusMap: Record<EngineerTasksEnums, TaskStatusEnums[]> = {
      [EngineerTasksEnums.ASSIGNED]: [TaskStatusEnums.ASSIGNED],
      [EngineerTasksEnums.UNRESOLVED]: [TaskStatusEnums.UNRESOLVED],
      [EngineerTasksEnums.RESOLVED]: [TaskStatusEnums.FIXED],
      [EngineerTasksEnums.ACTIVE]: [TaskStatusEnums.IN_PROGRESS],
      [EngineerTasksEnums.REASSIGNED]: [TaskStatusEnums.REASSIGNED],
    };

    console.log(userId);

    const statuses = statusMap[status];
    if (!statuses) return null;

    // Build filter object
    const filter: any = {
      assignee: userId,
    };

    // --- CRITICAL CHANGE: Use $expr to check the last status ---
    filter.$expr = {
      $in: [
        {
          $arrayElemAt: [
            '$statusDetails.status', // Array of all status strings
            -1, // Index -1 returns the last element
          ],
        },
        statuses, // The target statuses array (e.g., ['FIXED'])
      ],
    };
    // ------

    // Add date range filter if provided
    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = from;
      }
      if (to) {
        filter.createdAt.$lte = to;
      }
    }

    // Reuse the same repository call
    const lagos = await this.tasksRepository.getTaskLogs({
      filter,
      query: {
        ...query,
        sort: { createdAt: -1 },
        population: ['atm'],
      },
    });
    return lagos;
  }

  public async getAllTasks(data: {
    assignee?: string;
    atm?: string;
    status?: TaskStatusEnums;
    from?: Date;
    to?: Date;
    query: BaseQuery;
  }) {
    const { assignee, atm, status, from, to, query } = data;

    const filter: FilterQuery<TasksLogsDocument> = {};

    if (assignee) {
      filter.assignee = assignee;
    }

    if (atm) {
      filter.atm = atm;
    }

    if (status) {
      filter['statusDetails.status'] = status;
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        filter.createdAt.$gte = from;
      }
      if (to) {
        filter.createdAt.$lte = to;
      }
    }

    return this.tasksRepository.getTaskLogs({
      filter,
      query: {
        ...query,
        sort: { createdAt: -1 },
        population: ['atm', 'assignee'],
      },
    });
  }

  public async registerIssueLogs(data: CreateNewLog) {
    const log = await this.tasksRepository.createIssueLog({
      atm: data.atm,
      healthStatus: data.healthStatus,
    });

    const existingTask = (await this.tasksRepository.getTaskLogs({
      filter: {
        taskTitle: data.taskTitle,
        atm: data.atm,
        'statusDetails.status': {
          $nin: [
            TaskStatusEnums.FIXED,
            TaskStatusEnums.UNRESOLVED,
            TaskStatusEnums.REASSIGNED,
          ],
        },
      },
      query: {
        population: ['assignee'],
      },
    })) as TasksLogsDocument[];
    if (existingTask && existingTask.length > 0) {
      // await this.notificationService.sendPushNotification({
      //   taskTitle: data.taskTitle!,
      //   taskId: existingTask[0].id,
      //   atmId: data.atm,
      //   status: data.healthStatus,
      //   token: (existingTask[0].assignee as UserDocument).expoToken,
      // });
      return {
        issueLog: log,
        task: existingTask[0],
        assignedTo: null,
        estimatedWorkload: 0,
      };
    }

    const assignmentResult = await this.createAndAssignTasks(data);
    log.task = assignmentResult.task.id;
    await log.save();

    await this.notificationService.sendPushNotification({
      taskTitle: data.taskTitle!,
      atmId: data.atm,
      taskId: assignmentResult.task.id,
      status: data.healthStatus,
      token: (assignmentResult.assignedTo as any).expoToken,
    });
    await this.notificationService.sendWhatsappMessage({
      content: `New Task Assigned: ${data.taskTitle}\nATM ID: ${data.atm}\nDescription: ${data.issueDescription}\nAssigned To: ${(assignmentResult.assignedTo as any).name}`,
      phoneNumber: (assignmentResult.assignedTo as any).phoneNumber,
    });

    return {
      issueLog: log,
      ...assignmentResult,
    };
  }

  public async createAndAssignTasks(data: CreateNewLog) {
    const atm = await this.bankkRepository.getAtm({ _id: data.atm });
    if (!atm) {
      throw new NotFoundException('ATM not found');
    }

    const nearbyEngineers = await this.userRepository.getUsers({
      role: UserRole.ENGINEER,
      activityStatus: ActivityStatus.ONLINE,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: atm.location.coordinates,
          },
        },
      },
    });

    if (!nearbyEngineers || nearbyEngineers.length === 0) {
      throw new BadRequestException('No available engineers found');
    }

    const avgFixTimeByTitle = await this.tasksRepository.taskAggregation([
      {
        $match: {
          'statusDetails.status': TaskStatusEnums.FIXED,
          taskTitle: { $exists: true },
        },
      },
      {
        $addFields: {
          assignedTime: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$statusDetails',
                  cond: {
                    $in: ['$$this.status', [TaskStatusEnums.ASSIGNED]],
                  },
                },
              },
              0,
            ],
          },
          fixedTime: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$statusDetails',
                  cond: { $eq: ['$$this.status', TaskStatusEnums.FIXED] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          timeToFix: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ['$fixedTime.time', new Date()] },
                  { $ifNull: ['$assignedTime.time', new Date()] },
                ],
              },
              3600000, // Convert milliseconds to hours
            ],
          },
        },
      },
      {
        $group: {
          _id: '$taskTitle',
          avgTimeToFixHours: { $avg: '$timeToFix' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgFixTimeMap = new Map<string, number>();
    avgFixTimeByTitle.forEach((item: any) => {
      avgFixTimeMap.set(item._id, item.avgTimeToFixHours || 2); // Default 2 hours if no history
    });

    const defaultEstimatedTime = 2;

    const engineerWorkloads = await Promise.all(
      nearbyEngineers.map(async (engineer) => {
        const assignedTasks = await this.tasksRepository.getTaskLogs({
          filter: {
            assignee: engineer._id,
            'statusDetails.status': {
              $in: [TaskStatusEnums.ASSIGNED, TaskStatusEnums.IN_PROGRESS],
            },
          },
        });

        const tasksList = Array.isArray(assignedTasks)
          ? assignedTasks
          : assignedTasks.data;

        // Calculate total estimated time for all assigned tasks
        const totalEstimatedTime = tasksList.reduce((total, task) => {
          const estimatedTime =
            avgFixTimeMap.get(task.taskTitle) || defaultEstimatedTime;
          return total + estimatedTime;
        }, 0);

        return {
          engineer,
          totalEstimatedTime,
          currentTaskCount: tasksList.length,
        };
      }),
    );

    engineerWorkloads.sort(
      (a, b) => a.totalEstimatedTime - b.totalEstimatedTime,
    );

    const selectedEngineer = engineerWorkloads[0].engineer;

    const task = await this.tasksRepository.createTaskLog({
      assignee: selectedEngineer._id,
      atm: data.atm,
      issueDescription: data.issueDescription,
      taskTitle: data.taskTitle,
      taskType: data.taskType,
      statusDetails: [
        {
          status: TaskStatusEnums.ASSIGNED,
          time: new Date(),
        },
      ],
    });

    return {
      task,
      assignedTo: selectedEngineer,
      estimatedWorkload: engineerWorkloads[0].totalEstimatedTime,
    };
  }

  public async changeTaskStatus(data: ChangeTaskStatusRequests) {
    const { taskId, status, engineerNote } = data;
    const task = await this.tasksRepository.getTaskLog({ _id: taskId });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Update task status by adding new status to statusDetails array
    const updatedTask = await this.tasksRepository.updateTaskLog(
      { _id: taskId },
      {
        $push: {
          statusDetails: {
            status,
            time: new Date(),
          },
        },
        engineerNote,
      },
    );

    // If status is FIXED, check if there are any other open tickets for this ATM
    if (status === TaskStatusEnums.FIXED) {
      const openTasks = await this.tasksRepository.getTaskLogs({
        filter: {
          atm: task.atm,
          _id: { $ne: taskId }, // Exclude current task
          'statusDetails.status': {
            $nin: [
              TaskStatusEnums.FIXED,
              TaskStatusEnums.UNRESOLVED,
              TaskStatusEnums.REASSIGNED,
            ],
          },
        },
      });

      const openTasksList = Array.isArray(openTasks)
        ? openTasks
        : openTasks.data;

      // If no open tasks remain, update ATM health status to HEALTHY
      if (!openTasksList || openTasksList.length === 0) {
        await this.bankkRepository.updateAtm(
          { _id: task.atm as string },
          {
            healthStatus: AtmHealthStatus.HEALTHY,
          },
        );
      }

      await this.reassignFromBusiestEngineer(task);
    } else if (status === TaskStatusEnums.UNRESOLVED) {
      // Reassign to the engineer with most experience in this task type
      await this.reassignToMostExperiencedEngineer(task);
    }

    return updatedTask;
  }

  private async reassignFromBusiestEngineer(completedTask: TasksLogsDocument) {
    const atm = await this.bankkRepository.getAtm({
      _id: completedTask.atm as string,
    });
    if (!atm) {
      return;
    }

    const nearbyEngineers = await this.userRepository.getUsers({
      role: UserRole.ENGINEER,
      activityStatus: ActivityStatus.ONLINE,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: atm.location.coordinates,
          },
        },
      },
    });

    if (!nearbyEngineers || nearbyEngineers.length === 0) {
      return;
    }

    const avgFixTimeByTitle = await this.tasksRepository.taskAggregation([
      {
        $match: {
          'statusDetails.status': TaskStatusEnums.FIXED,
          taskTitle: { $exists: true },
        },
      },
      {
        $addFields: {
          assignedTime: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$statusDetails',
                  cond: {
                    $in: ['$$this.status', [TaskStatusEnums.ASSIGNED]],
                  },
                },
              },
              0,
            ],
          },
          fixedTime: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$statusDetails',
                  cond: { $eq: ['$$this.status', TaskStatusEnums.FIXED] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          timeToFix: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ['$fixedTime.time', new Date()] },
                  { $ifNull: ['$assignedTime.time', new Date()] },
                ],
              },
              3600000,
            ],
          },
        },
      },
      {
        $group: {
          _id: '$taskTitle',
          avgTimeToFixHours: { $avg: '$timeToFix' },
          count: { $sum: 1 },
        },
      },
    ]);

    const avgFixTimeMap = new Map<string, number>();
    avgFixTimeByTitle.forEach((item: any) => {
      avgFixTimeMap.set(item._id, item.avgTimeToFixHours || 2);
    });

    const defaultEstimatedTime = 2;

    const engineerWorkloads = await Promise.all(
      nearbyEngineers.map(async (engineer) => {
        const assignedTasks = await this.tasksRepository.getTaskLogs({
          filter: {
            assignee: engineer._id,
            'statusDetails.status': {
              $in: [TaskStatusEnums.ASSIGNED, TaskStatusEnums.IN_PROGRESS],
            },
          },
        });

        const tasksList = Array.isArray(assignedTasks)
          ? assignedTasks
          : assignedTasks.data;

        const tasksWithEstimatedTime = tasksList.map((t) => ({
          task: t,
          estimatedTime: avgFixTimeMap.get(t.taskTitle) || defaultEstimatedTime,
        }));

        const totalEstimatedTime = tasksWithEstimatedTime.reduce(
          (total, t) => total + t.estimatedTime,
          0,
        );

        return {
          engineer,
          totalEstimatedTime,
          tasksWithEstimatedTime,
        };
      }),
    );

    const eligibleEngineers = engineerWorkloads.filter(
      (e) => e.engineer._id !== completedTask.assignee,
    );

    if (eligibleEngineers.length === 0) {
      return;
    }

    eligibleEngineers.sort(
      (a, b) => b.totalEstimatedTime - a.totalEstimatedTime,
    );

    const busiestEngineer = eligibleEngineers[0];

    if (
      !busiestEngineer.tasksWithEstimatedTime ||
      busiestEngineer.tasksWithEstimatedTime.length === 0
    ) {
      return;
    }

    const sortedTasks = [...busiestEngineer.tasksWithEstimatedTime].sort(
      (a, b) => a.estimatedTime - b.estimatedTime,
    );

    const taskToReassign = sortedTasks[0].task;

    await this.tasksRepository.updateTaskLog(
      { _id: taskToReassign._id },
      {
        $push: {
          statusDetails: {
            status: TaskStatusEnums.REASSIGNED,
            time: new Date(),
          },
        },
      },
    );

    await this.tasksRepository.createTaskLog({
      assignee: completedTask.assignee,
      atm: taskToReassign.atm,
      issueDescription: taskToReassign.issueDescription,
      taskTitle: taskToReassign.taskTitle,
      taskType: taskToReassign.taskType,
      statusDetails: [
        {
          status: TaskStatusEnums.ASSIGNED,
          time: new Date(),
        },
      ],
    });
  }

  private async reassignToMostExperiencedEngineer(
    unresolvedTask: TasksLogsDocument,
  ) {
    const atm = await this.bankkRepository.getAtm({
      _id: unresolvedTask.atm as string,
    });
    if (!atm) {
      return;
    }

    const nearbyEngineers = await this.userRepository.getUsers({
      role: UserRole.ENGINEER,
      activityStatus: ActivityStatus.ONLINE,
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: atm.location.coordinates,
          },
        },
      },
    });

    if (!nearbyEngineers || nearbyEngineers.length === 0) {
      return;
    }

    const engineerExperienceData = await Promise.all(
      nearbyEngineers.map(async (engineer) => {
        const completedTasksCount = await this.tasksRepository.taskAggregation([
          {
            $match: {
              assignee: engineer._id,
              taskTitle: unresolvedTask.taskTitle,
              'statusDetails.status': TaskStatusEnums.FIXED,
            },
          },
          {
            $count: 'completedCount',
          },
        ]);

        const count =
          completedTasksCount.length > 0
            ? completedTasksCount[0].completedCount
            : 0;

        return {
          engineer,
          completedTasksCount: count,
        };
      }),
    );

    engineerExperienceData.sort(
      (a, b) => b.completedTasksCount - a.completedTasksCount,
    );

    const mostExperiencedEngineer = engineerExperienceData[0];

    if (mostExperiencedEngineer.completedTasksCount === 0) {
      const targetEngineer = mostExperiencedEngineer.engineer;

      await this.tasksRepository.createTaskLog({
        assignee: targetEngineer._id,
        atm: unresolvedTask.atm,
        issueDescription: unresolvedTask.issueDescription,
        taskTitle: unresolvedTask.taskTitle,
        taskType: unresolvedTask.taskType,
        statusDetails: [
          {
            status: TaskStatusEnums.ASSIGNED,
            time: new Date(),
          },
        ],
      });

      return;
    }

    // await this.tasksRepository.updateTaskLog(
    //   { _id: unresolvedTask._id },
    //   {
    //     $push: {
    //       statusDetails: {
    //         status: TaskStatusEnums.REASSIGNED,
    //         time: new Date(),
    //       },
    //     },
    //   },
    // );

    await this.tasksRepository.createTaskLog({
      assignee: mostExperiencedEngineer.engineer._id,
      atm: unresolvedTask.atm,
      issueDescription: unresolvedTask.issueDescription,
      taskTitle: unresolvedTask.taskTitle,
      taskType: unresolvedTask.taskType,
      statusDetails: [
        {
          status: TaskStatusEnums.ASSIGNED,
          time: new Date(),
        },
      ],
    });
  }

  public async getAtmFixHsitory(query: BaseQuery, atmId: string) {
    return this.tasksRepository.getTaskLogs({
      filter: { atm: atmId },
      query: {
        ...query,
        sort: { createdAt: -1 },
        population: ['assignee'],
      },
    });
  }

  public async getTaskById(taskId: string) {
    const task = await this.tasksRepository.getTaskLog(
      { _id: taskId },
      { population: ['assignee', 'atm'] },
    );
    if (!task) {
      throw new NotFoundException('Task not found');
    }
    return task;
  }

  // Assuming this method is inside your service class

  public async generateDiagnosticReport(taskId: string) {
    const task = await this.tasksRepository.getTaskLog({ _id: taskId });
    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Get ATM details
    const atm = await this.bankkRepository.getAtm({
      _id: task.atm as string,
    });

    // Get historical tasks with the same title that were successfully fixed
    const historicalTasks = await this.tasksRepository.getTaskLogs({
      filter: {
        taskTitle: task.taskTitle,
        'statusDetails.status': TaskStatusEnums.FIXED,
      },
      query: {
        limit: 10,
        sort: { createdAt: -1 },
      },
    });

    const historicalTasksList = Array.isArray(historicalTasks)
      ? historicalTasks
      : historicalTasks.data;

    // Get recent issue logs for the ATM
    const recentIssueLogs = await this.tasksRepository.getIssueLogs({
      filter: {
        atm: task.atm as string,
      },
      query: {
        limit: 5,
        sort: { time: -1 },
      },
    });

    const recentIssueLogsList = Array.isArray(recentIssueLogs)
      ? recentIssueLogs
      : recentIssueLogs.data;

    // Prepare historical context
    const historicalContext = historicalTasksList
      .map(
        (historicalTask, index) => `
Case ${index + 1}:
- Issue Description: ${historicalTask.issueDescription || 'N/A'}
- Engineer Note: ${historicalTask.engineerNote || 'N/A'}
- Time to Fix: ${this.calculateTimeToFix(historicalTask)} hours
- Status History: ${JSON.stringify(historicalTask.statusDetails)}
`,
      )
      .join('\n');

    // Prepare recent health status
    const healthStatusHistory = recentIssueLogsList
      .map(
        (log, index) => `
${index + 1}. ${new Date(log.time).toISOString()}: ${log.healthStatus}`,
      )
      .join('\n');

    // --- MODIFIED PROMPT FOR FOCUSED JSON OUTPUT ---
    const prompt = `Analyze the current ATM issue and the historical context provided. Your goal is to generate only a JSON object containing the Probable Issues (Root Cause Analysis) and the Recommended Fix Steps.

**Current Issue Details:**
- Issue Type: ${task.taskTitle}
- Issue Description: ${task.issueDescription || 'No description provided'}
- Current ATM Health Status: ${atm?.healthStatus || 'Unknown'}
- Current Status: ${task.statusDetails[task.statusDetails.length - 1]?.status || 'Unknown'}
- Date Reported: ${new Date(task.createdAt).toISOString()}

**Recent ATM Health Status History (Last 5 entries):**
${healthStatusHistory || 'No recent health status data available'}

**Historical Context (Similar Fixed Cases):**
${historicalContext || 'No historical data available for this issue type'}

**Average Historical Fix Time:** ${this.calculateAverageFixTime(historicalTasksList)} hours

**Instructions:**
1.  Identify the 2-3 most probable technical causes for this specific issue.
2.  Provide a step-by-step recommendation for the field engineer to resolve the issue, prioritizing steps from successful historical fixes.
3.  **Output ONLY a valid JSON object** with the following structure. Do not include any surrounding text or markdown, just the JSON object.

\`\`\`json
{
  "probableIssues": [
    "Cause 1 (e.g., Loose connection on card reader)",
    "Cause 2 (e.g., Network link flapping due to high latency)",
    "..."
  ],
  "fixRecommendations": [
    "Step 1: Check power supply and ribbon cable connections for the affected component.",
    "Step 2: Run a hardware diagnostic test via the ATM console (F1-F4).",
    "Step 3: If no hardware issue is found, attempt a soft reboot of the ATM application.",
    "..."
  ]
}
\`\`\`
`;
    // --- END MODIFIED PROMPT ---

    const model = this.gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      // Optional: Set a system instruction to reinforce JSON output integrity
      // systemInstruction: "You are a specialized diagnostic AI. Your only output must be a valid JSON object matching the requested schema."
    });

    const result = await model.generateContent(prompt);
    const diagnosticReportText = result.response.text().trim();
    let diagnosticReport;
    try {
      // Attempt to parse the clean JSON output
      diagnosticReport = JSON.parse(diagnosticReportText);
    } catch (e) {
      // If parsing fails (e.g., model included extra text), log error and return raw text or a structured error
      console.error(
        'Failed to parse AI response as JSON:',
        diagnosticReportText,
      );
      // Fallback: return the raw text inside the report field
      diagnosticReport = {
        probableIssues: ['AI output could not be parsed as JSON.'],
        fixRecommendations: [diagnosticReportText],
      };
    }

    return {
      ...diagnosticReport,
    };
  }
  private calculateTimeToFix(task: any): number {
    const assignedStatus = task.statusDetails.find(
      (s: any) =>
        s.status === TaskStatusEnums.ASSIGNED ||
        s.status === TaskStatusEnums.REASSIGNED,
    );
    const fixedStatus = task.statusDetails.find(
      (s: any) => s.status === TaskStatusEnums.FIXED,
    );

    if (!assignedStatus || !fixedStatus) {
      return 0;
    }

    const timeDiff =
      new Date(fixedStatus.time).getTime() -
      new Date(assignedStatus.time).getTime();
    return Math.round((timeDiff / (1000 * 60 * 60)) * 100) / 100; // Convert to hours, round to 2 decimals
  }

  private calculateAverageFixTime(tasks: any[]): number {
    if (tasks.length === 0) return 0;

    const totalTime = tasks.reduce((sum, task) => {
      return sum + this.calculateTimeToFix(task);
    }, 0);

    return Math.round((totalTime / tasks.length) * 100) / 100; // Round to 2 decimals
  }

  private canTransition(
    currentStatus: TaskStatusEnums,
    newStatus: TaskStatusEnums,
  ): boolean {
    const validNextStatuses = allowedTransitions[currentStatus];
    return validNextStatuses.includes(newStatus);
  }

  // @Cron(CronExpression.EVERY_5_SECONDS)
  public async testWhatsapp() {
    await this.notificationService.sendWhatsappMessage({
      content: `This is a test message from ATM Maintenance System.`,
      phoneNumber: '2348056892881',
    });
  }
}
