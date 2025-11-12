import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { EngineerTasksEnums } from './interface/tasks.responses';
import { BaseQuery } from '../../resources/interfaces';
import { TaskStatusEnums } from './interface/tasks.enums';
import { FilterQuery } from 'mongoose';
import { TasksLogsDocument } from './schemas/tasks.logs.schema';
import { CreateNewLog } from './interface/tasks.requests';
import { UserRepository } from '../user/user.repository';
import { UserRole } from '../user/interfaces/enums/user.enums';
import { ActivityStatus } from '../user/schemas/user.schema';
import { BankRepository } from '../bank/bank.repository';
import { NotificationService } from '../notifcation/notification.service';
import { AtmHealthStatus } from '../bank/interfaces/atm.enums';

@Injectable()
export class TasksService {
  constructor(
    private readonly tasksRepository: TasksRepository,
    private readonly userRepository: UserRepository,
    private readonly bankkRepository: BankRepository,
    private readonly notificationService: NotificationService,
  ) {}

  public async getEngineerTasks(data: {
    user: string;
    status: EngineerTasksEnums;
    query: BaseQuery;
    from?: Date;
    to?: Date;
  }) {
    const { user: userId, status, query, from, to } = data;

    // Map each engineer task type to corresponding TaskStatusEnums
    const statusMap: Record<EngineerTasksEnums, TaskStatusEnums[]> = {
      [EngineerTasksEnums.ASSIGNED]: [TaskStatusEnums.ASSIGNED],
      [EngineerTasksEnums.UNRESOLVED]: [TaskStatusEnums.REASSIGNED],
      [EngineerTasksEnums.RESOLVED]: [TaskStatusEnums.FIXED],
      [EngineerTasksEnums.ACTIVE]: [TaskStatusEnums.IN_PROGRESS],
      [EngineerTasksEnums.REASSIGNED]: [TaskStatusEnums.REASSIGNED],
    };

    const statuses = statusMap[status];
    if (!statuses) return null;

    // Build filter object
    const filter: any = {
      assignee: userId,
      'statusDetails.status': { $in: statuses },
    };

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
    return this.tasksRepository.getTaskLogs({
      filter,
      query: {
        ...query,
        sort: { createdAt: -1 },
        population: ['atm'],
      },
    });
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
        population: ['atm'],
      },
    });
  }

  public async registerIssueLogs(data: CreateNewLog) {
    const log = await this.tasksRepository.createIssueLog({
      atm: data.atm,
      healthStatus: data.healthStatus,
    });

    const assignmentResult = await this.createAndAssignTasks(data);
    log.task = assignmentResult.task.id;
    await log.save();

    await this.notificationService.sendPushNotification({
      taskTitle: data.taskTitle!,
      atmId: data.atm,
      taskId: assignmentResult.task.id,
      status: data.healthStatus,
      token: (assignmentResult.assignedTo as any).expoPushToken,
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

  public async changeTaskStatus(status: TaskStatusEnums, taskId: string) {
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

      // Reassign tasks from the busiest engineer to the engineer who just completed
      await this.reassignFromBusiestEngineer(task);
    } else if (status === TaskStatusEnums.UNRESOLVED) {
    }

    return updatedTask;
  }

  private async reassignFromBusiestEngineer(completedTask: TasksLogsDocument) {
    // Get the ATM location
    const atm = await this.bankkRepository.getAtm({
      _id: completedTask.atm as string,
    });
    if (!atm) {
      return;
    }

    // Get online engineers near the ATM
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

    // Calculate average time to fix for each task title using aggregation
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

    // Calculate workload for each engineer
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

        // Calculate individual task times and total
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

    // Filter out the engineer who just completed the task
    const eligibleEngineers = engineerWorkloads.filter(
      (e) => e.engineer._id !== completedTask.assignee,
    );

    if (eligibleEngineers.length === 0) {
      return;
    }

    // Sort by total estimated time (descending) to find busiest engineer
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

    // Find the task with the least estimated time from the busiest engineer
    const sortedTasks = [...busiestEngineer.tasksWithEstimatedTime].sort(
      (a, b) => a.estimatedTime - b.estimatedTime,
    );

    const taskToReassign = sortedTasks[0].task;

    // Mark the old task as REASSIGNED
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

    // Create a new task for the engineer who just completed their task
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
}
