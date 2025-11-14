import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsSemVer,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../user/interfaces/enums/user.enums';
import { Type } from 'class-transformer';
import { AtmActivityStatus, AtmTransactionType } from '../interfaces/atm.enums';
import { ActivityStatus } from '../../user/schemas/user.schema';

export class GeolocationDTO {
  @IsString()
  @IsOptional()
  @ApiProperty({ example: '40.7128', required: false })
  latitude: string;

  @IsString()
  @IsOptional()
  @ApiProperty({ example: '-74.0060', required: false })
  longitude: string;
}

export class CreateATMDto {
  @IsOptional()
  @ApiProperty({ required: false, type: GeolocationDTO })
  @Type(() => GeolocationDTO)
  geolocation?: GeolocationDTO;
}

export class CreateATMTransactioon {
  @ApiProperty({ required: true, enum: AtmTransactionType })
  @IsEnum(AtmTransactionType)
  transactionType: AtmTransactionType;

  @ApiProperty({ required: true, type: Number })
  @IsNumber()
  n1000: number;

  @ApiProperty({ required: true, type: Number })
  @IsNumber()
  n500: number;

  @ApiProperty({ required: true, type: Number })
  @IsNumber()
  n200: number;
}

export class ToggleAtmOnlineDto {
  @ApiProperty({ example: true, required: true, enum: AtmActivityStatus })
  @IsEnum(AtmActivityStatus)
  activityStatus: AtmActivityStatus;
}
