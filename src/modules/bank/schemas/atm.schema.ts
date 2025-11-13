import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'mongoose';
import { AtmActivityStatus, AtmHealthStatus } from '../interfaces/atm.enums';

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
export class ATM {
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
    enum: AtmActivityStatus,
    default: AtmActivityStatus.ONLINE,
  })
  activitySatus: AtmActivityStatus;

  @ApiProperty()
  @Prop({
    type: String,
    enum: AtmHealthStatus,
    default: AtmHealthStatus.HEALTHY,
  })
  healthStatus: AtmHealthStatus;

  @ApiProperty({
    description: 'GeoJSON Point [lng, lat]',
    example: {
      type: 'Point',
      coordinates: [3.3792, 6.5244], // Lagos
    },
  })
  @Prop({
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number],
      required: true,
    },
  })
  location: {
    type: 'Point';
    coordinates: [number, number];
  };

  @ApiProperty()
  @Prop({ type: Date, default: null })
  lastLivenessAt: Date | null;

  @ApiProperty()
  @Prop({ type: Number, default: 0 })
  missCount: number;
}

export type AtmDocument = ATM & Document;
export const ATMSchema = SchemaFactory.createForClass(ATM);
ATMSchema.index({ location: '2dsphere' });
