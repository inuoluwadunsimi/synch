import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'mongoose';
import { ATM, AtmDocument } from '../../bank/schemas/atm.schema';
import {
  AtmActivityStatus,
  AtmHealthStatus,
} from '../../bank/interfaces/atm.enums';
import { TasksLogs, TasksLogsDocument } from './tasks.logs.schema';
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
export class IssueLogs {
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
    ref: ATM.name,
  })
  atm: string | AtmDocument;

  @ApiProperty()
  @Prop({
    type: String,
    enum: AtmActivityStatus,
    default: AtmHealthStatus.HEALTHY,
  })
  healthStatus: AtmHealthStatus;

  @ApiProperty()
  @Prop({
    type: Date,
    default: Date.now(),
  })
  time: Date;

  @ApiProperty()
  @Prop({
    type: String,
    ref: TasksLogs.name,
  })
  task: TasksLogsDocument | string;
}

export type IssueLogsDocument = IssueLogs & Document;
export const IssueLogsSchema = SchemaFactory.createForClass(IssueLogs);
