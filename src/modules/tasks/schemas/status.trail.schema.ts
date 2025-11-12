import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { TaskStatusEnums } from '../interface/tasks.enums';

@Schema()
export class StatusTrail {
  @ApiProperty()
  @Prop({
    type: String,
    enum: Object.values(TaskStatusEnums),
    default: TaskStatusEnums.ASSIGNED,
  })
  status: TaskStatusEnums;

  @ApiProperty()
  @Prop({
    type: Date,
  })
  time: Date;
}

export const StatusTrailSchema = SchemaFactory.createForClass(StatusTrail);
