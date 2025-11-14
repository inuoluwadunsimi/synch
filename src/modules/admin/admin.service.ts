import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { BankRepository } from '../bank/bank.repository';
import { TasksRepository } from '../tasks/tasks.repository';
import { AtmHealthStatus } from '../bank/interfaces/atm.enums';
import { TaskStatusEnums } from '../tasks/interface/tasks.enums';
import moment from 'moment';

@Injectable()
export class AdminService {
  constructor(
    private readonly bankRepository: BankRepository,
    private readonly taskRepository: TasksRepository,
  ) {}

  public async getDashboards() {
    const issues = await this.taskRepository.getTaskLogs({ filter: {} });

    const warningAtms = await this.bankRepository.countAtms({
      healthStatus: AtmHealthStatus.WARNING,
    });
    const healthyAtms = await this.bankRepository.countAtms({
      healthStatus: AtmHealthStatus.HEALTHY,
    });
    const degradedAtms = await this.bankRepository.countAtms({
      healthStatus: AtmHealthStatus.DEGRADED,
    });
    const criticalAtms = await this.bankRepository.countAtms({
      healthStatus: AtmHealthStatus.CRITICAL,
    });

    const avgFixTimeInMinutes = await this.getAverageFixTime();

    const avgUptimePercentage = await this.getAverageUptime(30);

    return {
      issues,
      atmHealthSummary: {
        healthy: healthyAtms,
        warning: warningAtms,
        degraded: degradedAtms,
        critical: criticalAtms,
      },
      avgFixTimeInMinutes,
      avgUptimePercentage,
    };
  }

  public async getAverageFixTime(): Promise<number> {
    const result = await this.taskRepository.taskAggregation([
      // Stage 1: Filter for tasks that have been FIXED
      { $match: { 'statusDetails.status': TaskStatusEnums.FIXED } },

      // Stage 2: Deconstruct the statusDetails array
      { $unwind: '$statusDetails' },

      // Stage 3: Group by task to find the start (ASSIGNED) and end (FIXED) times
      {
        $group: {
          _id: '$_id',
          assignedTime: {
            $min: {
              $cond: [
                { $eq: ['$statusDetails.status', TaskStatusEnums.ASSIGNED] },
                '$statusDetails.time',
                null,
              ],
            },
          },
          fixedTime: {
            $max: {
              $cond: [
                { $eq: ['$statusDetails.status', TaskStatusEnums.FIXED] },
                '$statusDetails.time',
                null,
              ],
            },
          },
        },
      },

      // Stage 4: Calculate the fix duration for each task (in minutes)
      {
        $project: {
          _id: 1,
          fixDurationMinutes: {
            $divide: [
              { $subtract: ['$fixedTime', '$assignedTime'] },
              60000, // Convert milliseconds to minutes
            ],
          },
        },
      },

      // Stage 5: Calculate the final global average across all fixed tasks
      {
        $group: {
          _id: null,
          averageFixTimeMinutes: { $avg: '$fixDurationMinutes' },
        },
      },
    ]);

    // Returns the average fix time in minutes (or 0)
    return result.length > 0 ? result[0].averageFixTimeMinutes : 0;
  }

  public async getAverageUptime(days: number = 30): Promise<number> {
    const lookbackDate = moment().subtract(days, 'days').toDate();

    // 1. Get the total number of ATMs in the fleet (needed for calculation)
    const numATMs = await this.bankRepository.countAtms({});
    if (numATMs === 0) return 100; // Assume 100% if no ATMs exist

    const totalPeriodMinutes = days * 24 * 60; // Total minutes in the reporting period
    const totalExpectedMinutes = totalPeriodMinutes * numATMs; // Total minutes for the entire fleet

    const result = await this.taskRepository.issueAggregation([
      // Stage 1: Filter for the period and exclude HEALTHY status
      {
        $match: {
          time: { $gte: lookbackDate },
          healthStatus: { $ne: ' healthy' }, // Note the space in ' healthy'
        },
      },

      // Stage 2: Group and sort logs by ATM and time to enable window function
      { $sort: { atm: 1, time: 1 } },

      // Stage 3: Use $setWindowFields to find the time of the NEXT log within the same ATM
      {
        $setWindowFields: {
          partitionBy: '$atm',
          sortBy: { time: 1 },
          output: {
            nextTime: { $next: '$time' } as any,
          },
        },
      },

      // Stage 4: Calculate the duration of the downtime segment
      {
        $project: {
          atm: 1,
          // If nextTime is null (last log for the ATM), use the current moment as the end time
          endTime: {
            $ifNull: ['$nextTime', moment().toDate()],
          },
          time: '$time',
        },
      },

      // Stage 5: Calculate the duration in minutes for each non-HEALTHY segment
      {
        $project: {
          downtimeMinutes: {
            $divide: [{ $subtract: ['$endTime', '$time'] }, 60000],
          },
        },
      },

      // Stage 6: Calculate the total downtime across ALL ATMs in the fleet
      {
        $group: {
          _id: null, // Group all results together
          totalDowntimeMinutes: { $sum: '$downtimeMinutes' },
        },
      },
    ]);

    const totalDowntimeMinutes =
      result.length > 0 ? result[0].totalDowntimeMinutes : 0;

    // Final calculation
    const totalUptimeMinutes = totalExpectedMinutes - totalDowntimeMinutes;
    const averageUptimePercentage =
      (totalUptimeMinutes / totalExpectedMinutes) * 100;

    // Returns the fleet-wide uptime percentage
    return Math.max(0, averageUptimePercentage);
  }

  public async getAtmsWithLatestCash(): Promise<any[]> {
    const atmsWithCash = await this.bankRepository.atmAggregation([
      // Stage 1: Get the latest cash inventory for each ATM
      {
        $lookup: {
          from: 'atmcashinventories', // MUST be the actual collection name for AtmCashInventory
          localField: '_id',
          foreignField: 'atm',
          as: 'inventoryHistory',
        },
      },

      // Stage 2: Sort the inventory history array within each ATM document
      // This is crucial to put the latest entry at the beginning (or end)
      {
        $addFields: {
          inventoryHistory: {
            $sortArray: {
              input: '$inventoryHistory',
              sortBy: { createdAt: -1 }, // Sort by date descending (newest first)
            },
          },
        },
      },

      // Stage 3: Select only the first (latest) element of the sorted array
      {
        $addFields: {
          latestInventory: {
            $arrayElemAt: ['$inventoryHistory', 0],
          },
        },
      },

      // Stage 4: Project the final output fields
      {
        $project: {
          // Keep all fields from the ATM document
          _id: 1,
          activitySatus: 1,
          healthStatus: 1,
          location: 1,
          lastLivenessAt: 1,
          missCount: 1,
          createdAt: 1,
          updatedAt: 1,
          // Add the totalAmount from the latest inventory log
          totalAmount: { $ifNull: ['$latestInventory.totalAmount', 0] },
        },
      },
    ]);

    return atmsWithCash;
  }
}
