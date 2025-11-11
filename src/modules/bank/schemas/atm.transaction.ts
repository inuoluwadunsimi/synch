import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'mongoose';
import { AtmDocument } from './atm.schema';
import {
  AtmActivityStatus,
  AtmHealthStatus,
  AtmTransactionType,
} from '../interfaces/atm.enums';

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
export class AtmTransaction {
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
    required: true,
  })
  atm: string | AtmDocument;

  @ApiProperty()
  @Prop({
    type: Number,
  })
  totalAmount: number;

  @ApiProperty()
  @Prop({
    type: Number,
  })
  n200: number;

  @ApiProperty()
  @Prop({
    type: Number,
  })
  n500: number;

  @ApiProperty()
  @Prop({
    type: Number,
  })
  n1000: number;

  @ApiProperty()
  @Prop({
    type: String,
    enum: AtmTransactionType,
  })
  transactionType: AtmTransactionType;
}

export type AtmTransactionDocument = AtmTransaction & Document;
export const AtmTransactionSchema =
  SchemaFactory.createForClass(AtmTransaction);
