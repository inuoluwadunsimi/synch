import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { faker } from '@faker-js/faker';
import moment from 'moment';
import {
  TasksLogs,
  TasksLogsDocument,
} from '../tasks/schemas/tasks.logs.schema';
import { StatusTrail } from '../tasks/schemas/status.trail.schema';

// Define a function or map for realistic descriptions
const getIssueDescription = (taskTitle: TaskTitle): string => {
  const descriptions: { [key in TaskTitle]: string[] } = {
    [TaskTitle.NETWORK_OUTAGE]: [
      'ATM is offline and unable to connect to the bank host. Check WAN link status.',
      'Intermittent connection drops reported. Transactions are failing during peak hours.',
      'The primary network link is down. Failover to secondary link is not initiating.',
      'No TCP/IP communication possible with the core banking system.',
    ],
    [TaskTitle.LOW_CASH]: [
      'Cash cassette 2 is running low (below 10%). Urgent replenishment required.',
      'Low withdrawal limits have been enforced due to critical cash levels in all cassettes.',
      'Hopper is near empty. ATM needs immediate cash loading before end of day.',
    ],
    [TaskTitle.CARD_RETAINED]: [
      'Card slot is jammed after a customer transaction. Card retained. Security required for retrieval.',
      'Card reader failed to return card; device logs show a mechanical error during ejection.',
      'Customer reported card was retained during an inquiry. Device must be inspected.',
    ],
    [TaskTitle.CARD_JAMMED]: [
      'Card reader error: Card is stuck inside the input slot, preventing further use.',
      'Failing to read cards correctly; customer reports difficulty inserting and removing card.',
    ],
    [TaskTitle.CARD_EJECT_FAILURE]: [
      'Eject mechanism failure. Card presented but not pushed out completely.',
      'Card is sticking out partially after transaction. Check the card transport belt.',
    ],
    [TaskTitle.CASH_JAMMED]: [
      'Dispenser mechanism error. Notes jammed in the exit shutter. Manual intervention needed.',
      'Cash dispenser reports a failure to bundle and present notes. Possible foreign object detected.',
      'Multiple recent transactions failed due to cash stacking error within the dispenser.',
    ],
  };

  const relevantDescriptions = descriptions[taskTitle];
  return faker.helpers.arrayElement(relevantDescriptions);
};

// Add this helper function to your seeder file
const generateEngineerNote = (taskTitle: TaskTitle): string => {
  const resolutions: { [key in TaskTitle]: string[] } = {
    [TaskTitle.NETWORK_OUTAGE]: [
      'Rebooted router and confirmed WAN link is stable. Adjusted primary link DNS settings.',
      'Identified and replaced faulty network interface card (NIC). Connection to host is now stable.',
      'Performed full system reboot and validated communication with the banking core via diagnostic tool.',
      'Rerouted network cable to port 4 on the switch, restoring connectivity.',
    ],
    [TaskTitle.LOW_CASH]: [
      'Replenished all cassettes (1, 2, 3, and 4) to 100%. Tested successful dispensing of 40 notes.',
      'Loaded cash cassette 2. Cash sensor calibration performed successfully.',
      'Completed full cash replenishment and reset cash levels in the software dashboard.',
    ],
    [TaskTitle.CARD_RETAINED]: [
      'Accessed security cartridge, retrieved customer card, and securely stored it. Card reader firmware updated.',
      'Inspected and cleaned the card transport mechanism. Confirmed successful card reading and ejection test cycle.',
    ],
    [TaskTitle.CARD_JAMMED]: [
      'Removed foreign object (paper clip) from the card reader throat. Calibrated card sensors.',
      'Replaced the magnetic stripe read head. Passed 5 consecutive card tests.',
    ],
    [TaskTitle.CARD_EJECT_FAILURE]: [
      'Adjusted the card transport belt tension. Tested successful ejection cycle 10 times.',
      'Replaced the worn-out card exit shutter component. Card ejects smoothly now.',
    ],
    [TaskTitle.CASH_JAMMED]: [
      'Cleared notes jammed in the dispensing throat. Ran a full cash test cycle.',
      'Replaced the friction wheel in the dispenser unit. Successfully dispensed $500 in various denominations.',
      'Performed dispenser diagnostic reset. Issue resolved, confirmed with test transactions.',
    ],
  };

  const relevantResolutions = resolutions[taskTitle];
  return faker.helpers.arrayElement(relevantResolutions);
};

// Import your schemas, enums, and transition rules
import {
  TaskTitle,
  TaskType,
  TaskStatusEnums,
  allowedTransitions,
} from '../tasks/interface/tasks.enums';
import { ATM, AtmDocument } from '../bank/schemas/atm.schema';
import { User, UserDocument } from '../user/schemas/user.schema';

@Injectable()
export class TasksLogsSeeder {
  constructor(
    @InjectModel(TasksLogs.name)
    private readonly tasksLogsModel: Model<TasksLogsDocument>,
    @InjectModel(User.name)
    private readonly userModel: Model<UserDocument>,
    @InjectModel(ATM.name)
    private readonly atmModel: Model<AtmDocument>,
  ) {}

  /**
   * Generates a realistic, time-ordered status trail with valid transitions.
   * @param startDate The starting time for the trail (when the task was created).
   * @returns A StatusTrail array.
   */
  private generateStatusTrail(startDate: Date): StatusTrail[] {
    const trail: StatusTrail[] = [];
    let currentTime = moment(startDate);
    let currentStatus: TaskStatusEnums = TaskStatusEnums.ASSIGNED;

    // 1. Initial ASSIGNED status
    trail.push({
      status: currentStatus,
      time: currentTime.toDate(),
    });

    // Determine the final status (FIXED, UNRESOLVED, or REASSIGNED)
    const finalStatuses = [
      TaskStatusEnums.FIXED,
      TaskStatusEnums.UNRESOLVED,
      TaskStatusEnums.REASSIGNED,
    ];
    const finalStatus = faker.helpers.arrayElement(finalStatuses);

    // 2. Loop to build the trail
    while (currentStatus !== finalStatus && trail.length < 5) {
      const allowedNext = allowedTransitions[currentStatus].filter(
        (status) => status !== TaskStatusEnums.ASSIGNED, // ASSIGNED is only the start
      );

      // If the final status is in the allowed next steps, take it or choose a path toward it.
      let nextStatus: TaskStatusEnums;

      if (allowedNext.includes(finalStatus) && faker.datatype.boolean()) {
        nextStatus = finalStatus; // Reach the goal
      } else if (allowedNext.length > 0) {
        nextStatus = faker.helpers.arrayElement(allowedNext);
      } else {
        // Should not happen with current logic, but as a safeguard.
        break;
      }

      // Time progression: 5 minutes to 4 hours
      const minutesToAdd = faker.number.int({ min: 15, max: 240 });
      currentTime = currentTime.add(minutesToAdd, 'minutes');

      // Add the new status
      trail.push({
        status: nextStatus,
        time: currentTime.toDate(),
      });
      currentStatus = nextStatus;

      // Special case: If the task was REASSIGNED, the next log will belong to a new TaskLogs entry.
      // We stop the trail here as the logic asks for trails ending in those states.
      if (currentStatus === TaskStatusEnums.REASSIGNED) {
        break;
      }
    }

    return trail;
  }

  async seed(): Promise<void> {
    // 1. Clear existing data
    await this.tasksLogsModel.deleteMany({});
    console.log('🗑️ Cleared existing TasksLogs data.');

    // 2. Fetch required IDs
    const userDocs = await this.userModel.find({}, { _id: 1 }).limit(10).lean();
    const atmDocs = await this.atmModel.find({}, { _id: 1 }).limit(20).lean();

    if (userDocs.length === 0 || atmDocs.length === 0) {
      console.error(
        '🛑 ERROR: No Users or ATMs found. Please seed User and ATM collections first.',
      );
      return;
    }

    const assigneeIds = userDocs.map((u) => u._id);
    const atmIds = atmDocs.map((a) => a._id);
    const numberOfTasks = 100;

    const taskTitles = Object.values(TaskTitle);
    const taskTypes = Object.values(TaskType);
    const tasksToInsert: TasksLogs[] = [];

    // The earliest date for a task log (Yesterday)
    const earliestDate = moment().subtract(1, 'day').startOf('day').toDate();
    const latestDate = moment().toDate(); // Now

    // 3. Generate TaskLogs data
    for (let i = 0; i < numberOfTasks; i++) {
      // Pick a random creation date between yesterday and now
      const createdAt = faker.date.between({
        from: earliestDate,
        to: latestDate,
      });

      const taskTitle = faker.helpers.arrayElement(taskTitles);
      const taskType =
        taskTitle === TaskTitle.NETWORK_OUTAGE
          ? TaskType.SOFTWARE
          : faker.helpers.arrayElement(taskTypes);

      const statusDetails = this.generateStatusTrail(createdAt);

      // The updatedAt timestamp should be the time of the last status update
      const updatedAt = statusDetails[statusDetails.length - 1].time;

      const tasksLog: TasksLogs = {
        _id: faker.string.uuid(),
        assignee: faker.helpers.arrayElement(assigneeIds),
        taskTitle: taskTitle,
        taskType: taskType,
        atm: faker.helpers.arrayElement(atmIds),
        issueDescription: getIssueDescription(taskTitle),
        statusDetails: statusDetails,
        engineerNote:
          statusDetails[statusDetails.length - 1].status ===
          TaskStatusEnums.FIXED
            ? generateEngineerNote(taskTitle)
            : '',
        createdAt: createdAt,
        updatedAt: updatedAt,
      } as TasksLogs;

      tasksToInsert.push(tasksLog);
    }

    // 4. Insert data
    await this.tasksLogsModel.insertMany(tasksToInsert);
    console.log(`✅ Successfully seeded ${numberOfTasks} TasksLogs.`);
  }
}
