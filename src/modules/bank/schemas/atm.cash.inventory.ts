import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'mongoose';
import { AtmActivityStatus, AtmHealthStatus } from '../interfaces/atm.enums';
import { AtmDocument } from './atm.schema';

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
export class AtmCashInventory {
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
    default: 0,
  })
  totalAmount: number;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
  })
  n200: number;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
  })
  n500: number;

  @ApiProperty()
  @Prop({
    type: Number,
    default: 0,
  })
  n1000: number;
}

export type AtmCashInventoryDocument = AtmCashInventory & Document;
export const AtmCashInventorySchema =
  SchemaFactory.createForClass(AtmCashInventory);
