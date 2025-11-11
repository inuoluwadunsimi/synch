import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ATM, AtmDocument } from './schemas/atm.schema';
import { Model, FilterQuery, UpdateQuery, ProjectionType } from 'mongoose';
import {
  AtmCashInventory,
  AtmCashInventoryDocument,
} from './schemas/atm.cash.inventory';
import {
  AtmTransaction,
  AtmTransactionDocument,
} from './schemas/atm.transaction';
import { BaseQuery, PaginatedResult } from '../../resources/interfaces';

@Injectable()
export class BankRepository {
  constructor(
    @InjectModel(ATM.name) private readonly atmModel: Model<AtmDocument>,
    @InjectModel(AtmCashInventory.name)
    private readonly atmCashInventoryModel: Model<AtmCashInventoryDocument>,
    @InjectModel(AtmTransaction.name)
    private readonly atmTransactionModel: Model<AtmTransactionDocument>,
  ) {}

  public async createAtm(data: Partial<AtmDocument>): Promise<AtmDocument> {
    return await this.atmModel.create(data);
  }

  public async getAtm(
    filter: FilterQuery<AtmDocument>,
  ): Promise<AtmDocument | null> {
    return await this.atmModel.findOne(filter);
  }

  public async getAtms(data: {
    filter: FilterQuery<AtmDocument>;
    projection?: ProjectionType<AtmDocument>;
    query?: BaseQuery;
  }): Promise<PaginatedResult<AtmDocument>> {
    const { filter, projection, query } = data;
    const isPaginated = query?.limit || query?.page;

    const mongooseQuery = this.atmModel.find(filter, projection);
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
        this.atmModel.countDocuments(filter),
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

  public async updateAtm(
    filter: FilterQuery<AtmDocument>,
    update: UpdateQuery<AtmDocument>,
  ): Promise<AtmDocument | null> {
    return await this.atmModel.findOneAndUpdate(filter, update, { new: true });
  }

  public async deleteAtm(filter: FilterQuery<AtmDocument>) {
    return await this.atmModel.deleteOne(filter);
  }

  // ==================== ATM Cash Inventory Repository Methods ====================

  public async createCashInventory(
    data: Partial<AtmCashInventoryDocument>,
  ): Promise<AtmCashInventoryDocument> {
    return await this.atmCashInventoryModel.create(data);
  }

  public async getCashInventory(
    filter: FilterQuery<AtmCashInventoryDocument>,
    query?: BaseQuery,
  ): Promise<AtmCashInventoryDocument | null> {
    const mongoQuery = this.atmCashInventoryModel.findOne(filter);

    if (query?.sort) {
      mongoQuery.sort(query.sort);
    }

    return mongoQuery.exec();
  }
  public async getCashInventories(
    filter: FilterQuery<AtmCashInventoryDocument>,
  ): Promise<AtmCashInventoryDocument[]> {
    return await this.atmCashInventoryModel.find(filter);
  }

  public async updateCashInventory(
    filter: FilterQuery<AtmCashInventoryDocument>,
    update: UpdateQuery<AtmCashInventoryDocument>,
  ): Promise<AtmCashInventoryDocument | null> {
    return await this.atmCashInventoryModel.findOneAndUpdate(filter, update, {
      new: true,
    });
  }

  public async deleteCashInventory(
    filter: FilterQuery<AtmCashInventoryDocument>,
  ) {
    return await this.atmCashInventoryModel.deleteOne(filter);
  }

  // ==================== ATM Transaction Repository Methods ====================

  public async createTransaction(
    data: Partial<AtmTransactionDocument>,
  ): Promise<AtmTransactionDocument> {
    return await this.atmTransactionModel.create(data);
  }

  public async getTransaction(
    filter: FilterQuery<AtmTransactionDocument>,
  ): Promise<AtmTransactionDocument | null> {
    return await this.atmTransactionModel.findOne(filter);
  }

  public async getTransactions(
    filter: FilterQuery<AtmTransactionDocument>,
  ): Promise<AtmTransactionDocument[]> {
    return await this.atmTransactionModel.find(filter);
  }

  public async updateTransaction(
    filter: FilterQuery<AtmTransactionDocument>,
    update: UpdateQuery<AtmTransactionDocument>,
  ): Promise<AtmTransactionDocument | null> {
    return await this.atmTransactionModel.findOneAndUpdate(filter, update, {
      new: true,
    });
  }

  public async deleteTransaction(filter: FilterQuery<AtmTransactionDocument>) {
    return await this.atmTransactionModel.deleteOne(filter);
  }
}
