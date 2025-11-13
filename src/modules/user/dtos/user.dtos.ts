import { ApiProperty } from '@nestjs/swagger';
import { AtmActivityStatus } from '../../bank/interfaces/atm.enums';
import { IsEnum, IsString } from 'class-validator';
import { ActivityStatus } from '../schemas/user.schema';

export class ToggleOnlineDto {
  @ApiProperty({ example: true, required: true, enum: AtmActivityStatus })
  @IsEnum(ActivityStatus)
  activityStatus: ActivityStatus;
}

export class UpdateDto {
  @ApiProperty({ example: true, required: true, type: String })
  @IsString()
  expoToken: string;
}
