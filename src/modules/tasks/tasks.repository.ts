import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { IssueLogs, IssueLogsDocument } from './schemas/issue.logs.schema';
import {
  Model,
  FilterQuery,
  UpdateQuery,
  ProjectionType,
  PipelineStage,
} from 'mongoose';
import { TasksLogs, TasksLogsDocument } from './schemas/tasks.logs.schema';
import { BaseQuery, PaginatedResult } from '../../resources/interfaces';

@Injectable()
export class TasksRepository {
  constructor(
    @InjectModel(IssueLogs.name)
    private readonly issueLogsModel: Model<IssueLogsDocument>,
    @InjectModel(TasksLogs.name)
    private readonly tasksLogsModel: Model<TasksLogsDocument>,
  ) {}

  // ==================== IssueLogs Repository Methods ====================

  public async createIssueLog(
    data: Partial<IssueLogsDocument>,
  ): Promise<IssueLogsDocument> {
    return await this.issueLogsModel.create(data);
  }

  public async getIssueLog(
    filter: FilterQuery<IssueLogsDocument>,
    query?: BaseQuery,
  ): Promise<IssueLogsDocument | null> {
    const mongoQuery = this.issueLogsModel.findOne(filter);

    if (query?.sort) {
      mongoQuery.sort(query.sort);
    }

    return mongoQuery.exec();
  }

  public async getIssueLogs(data: {
    filter: FilterQuery<IssueLogsDocument>;
    projection?: ProjectionType<IssueLogsDocument>;
    query?: BaseQuery;
  }): Promise<PaginatedResult<IssueLogsDocument>> {
    const { filter, projection, query } = data;
    const isPaginated = query?.limit || query?.page;

    const mongooseQuery = this.issueLogsModel.find(filter, projection);
    if (query?.sort) {
      mongooseQuery.sort(query.sort);
    }

    if (query?.population) {
      mongooseQuery.populate(query.population);
    }

    if (isPaginated) {
      const limit = query?.limit ?? 10;
      const page = query?.page ?? 1;
      const skip = (page - 1) * limit;

      mongooseQuery.skip(skip).limit(limit);

      const [data, totalItems] = await Promise.all([
        mongooseQuery.exec(),
        this.issueLogsModel.countDocuments(filter),
      ]);

      return {
        data,
        totalItems,
        itemCount: data.length,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      };
    }

    return await mongooseQuery.exec();
  }

  public async updateIssueLog(
    filter: FilterQuery<IssueLogsDocument>,
    update: UpdateQuery<IssueLogsDocument>,
  ): Promise<IssueLogsDocument | null> {
    return await this.issueLogsModel.findOneAndUpdate(filter, update, {
      new: true,
    });
  }

  public async deleteIssueLog(filter: FilterQuery<IssueLogsDocument>) {
    return await this.issueLogsModel.deleteOne(filter);
  }

  public async issueAggregation(pipeline: PipelineStage[]) {
    return this.issueLogsModel.aggregate(pipeline);
  }

  // ==================== TasksLogs Repository Methods ====================

  public async createTaskLog(
    data: Partial<TasksLogsDocument>,
  ): Promise<TasksLogsDocument> {
    return await this.tasksLogsModel.create(data);
  }

  public async getTaskLog(
    filter: FilterQuery<TasksLogsDocument>,
    query?: BaseQuery,
  ): Promise<TasksLogsDocument | null> {
    const mongoQuery = this.tasksLogsModel.findOne(filter);

    if (query?.sort) {
      mongoQuery.sort(query.sort);
    }

    if (query?.population) {
      mongoQuery.populate(query.population);
    }

    return mongoQuery.exec();
  }

  public async getTaskLogs(data: {
    filter: FilterQuery<TasksLogsDocument>;
    projection?: ProjectionType<TasksLogsDocument>;
    query?: BaseQuery;
  }): Promise<PaginatedResult<TasksLogsDocument>> {
    const { filter, projection, query } = data;
    const isPaginated = query?.limit || query?.page;

    const mongooseQuery = this.tasksLogsModel.find(filter, projection);
    if (query?.sort) {
      mongooseQuery.sort(query.sort);
    }

    if (query?.population) {
      mongooseQuery.populate(query.population);
    }

    if (isPaginated) {
      const limit = query?.limit ?? 10;
      const page = query?.page ?? 1;
      const skip = (page - 1) * limit;

      mongooseQuery.skip(skip).limit(limit);

      const [data, totalItems] = await Promise.all([
        mongooseQuery.exec(),
        this.tasksLogsModel.countDocuments(filter),
      ]);

      return {
        data,
        totalItems,
        itemCount: data.length,
        currentPage: page,
        totalPages: Math.ceil(totalItems / limit),
      };
    }

    return await mongooseQuery.exec();
  }

  public async updateTaskLog(
    filter: FilterQuery<TasksLogsDocument>,
    update: UpdateQuery<TasksLogsDocument>,
  ): Promise<TasksLogsDocument | null> {
    return await this.tasksLogsModel.findOneAndUpdate(filter, update, {
      new: true,
    });
  }

  public async deleteTaskLog(filter: FilterQuery<TasksLogsDocument>) {
    return await this.tasksLogsModel.deleteOne(filter);
  }

  public async taskAggregation(pipeline: PipelineStage[]) {
    return this.tasksLogsModel.aggregate(pipeline);
  }
}
