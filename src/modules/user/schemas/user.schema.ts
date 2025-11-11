import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { v4 as uuidv4 } from 'uuid';
import { Document } from 'mongoose';
import { UserRole } from '../interfaces/enums/user.enums';

export enum ActivityStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
}

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
export class User {
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
    lowercase: true,
    trim: true,
    unique: true,
    required: true,
  })
  email: string;

  @ApiProperty()
  @Prop({
    type: String,
    sparse: true,
  })
  phoneNumber: string;

  @ApiProperty()
  @Prop({
    type: String,
  })
  firstName: string;

  @ApiProperty()
  @Prop({
    type: String,
  })
  lastName: string;

  @ApiProperty()
  @Prop({
    type: String,
    enum: UserRole,
    default: UserRole.ENGINEER,
  })
  role: UserRole;

  @ApiProperty()
  @Prop({
    type: String,
    enum: ActivityStatus.ONLINE,
    default: ActivityStatus.ONLINE,
  })
  activityStatus: ActivityStatus;

  @ApiProperty()
  @Prop({
    type: String,
  })
  profileImage: string;

  @ApiProperty()
  @Prop({
    type: String,
  })
  profileImageBlurHash: string;

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
}
export type UserDocument = User & Document;
export const UserSchema = SchemaFactory.createForClass(User);
