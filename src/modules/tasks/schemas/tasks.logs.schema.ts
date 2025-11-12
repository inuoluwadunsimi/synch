import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'mongoose';
import { User, UserDocument } from '../../user/schemas/user.schema';
import { ATM, AtmDocument } from '../../bank/schemas/atm.schema';
import { StatusTrail, StatusTrailSchema } from './status.trail.schema';
import { TaskTitle, TaskType } from '../interface/tasks.enums';

@Schema({
  timestamps: true,
  versionKey: false,
  toJSON: {
    transform(_doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
  toObject: {
    transform(_doc: any, ret: any) {
      ret.id = ret._id;
      delete ret._id;
      return ret;
    },
  },
})
export class TasksLogs {
  @ApiProperty()
  @Prop({
    type: String,
    default: function genUUID() {
      return uuidv4();
    },
  })
  _id: string;

  @ApiProperty()
  @Prop({
    type: String,
    ref: User.name,
  })
  assignee: string | UserDocument;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    enum: TaskTitle,
  })
  taskTitle: TaskTitle;

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
    enum: TaskType,
  })
  taskType: TaskType;

  @ApiProperty()
  @Prop({
    type: String,
    ref: ATM.name,
  })
  atm: string | AtmDocument;

  @ApiProperty()
  @Prop({
    type: String,
  })
  issueDescription: string;

  @ApiProperty({ type: StatusTrail })
  @Prop([
    {
      type: StatusTrailSchema,
    },
  ])
  statusDetails: StatusTrail[];

  @ApiProperty()
  @Prop({
    type: String,
    required: true,
  })
  engineerNote: string;
}
export type TasksLogsDocument = TasksLogs & Document;
export const TasksLogsSchema = SchemaFactory.createForClass(TasksLogs);
