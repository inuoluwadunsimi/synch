import { Injectable } from '@nestjs/common';
import { TasksRepository } from './tasks.repository';
import { EngineerTasksEnums } from './interface/tasks.responses';
import { BaseQuery } from '../../resources/interfaces';
import { TaskStatusEnums } from './interface/tasks.enums';
import { FilterQuery } from 'mongoose';
import { TasksLogsDocument } from './schemas/tasks.logs.schema';

@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

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
      [EngineerTasksEnums.ASSIGNED]: [
        TaskStatusEnums.WARNING,
        TaskStatusEnums.CRITICAL,
        TaskStatusEnums.DEGRADED,
      ],
      [EngineerTasksEnums.UNRESOLVED]: [TaskStatusEnums.REASSIGNED],
      [EngineerTasksEnums.RESOLVED]: [TaskStatusEnums.FIXED],
      [EngineerTasksEnums.ACTIVE]: [],
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
      query,
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
      query,
    });
  }
}
