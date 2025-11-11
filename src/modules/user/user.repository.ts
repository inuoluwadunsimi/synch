import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { FilterQuery, UpdateQuery, Model, PipelineStage } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { User, UserDocument } from './schemas/user.schema';

@Injectable()
export class UserRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  public async createUser(data: Partial<UserDocument>): Promise<UserDocument> {
    return await this.userModel.create(data);
  }
  public async getUser(
    filter: FilterQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return await this.userModel.findOne(filter);
  }
  public async getUsers(
    filter: FilterQuery<UserDocument>,
  ): Promise<UserDocument[]> {
    return await this.userModel.find(filter);
  }
  public async updateUser(
    filter: FilterQuery<UserDocument>,
    update: UpdateQuery<UserDocument>,
  ): Promise<UserDocument | null> {
    return await this.userModel.findOneAndUpdate(filter, update, { new: true });
  }
  public async deleteUser(filter: FilterQuery<UserDocument>) {
    return await this.userModel.deleteOne(filter);
  }
}
