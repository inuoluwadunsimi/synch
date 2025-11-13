import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { bool } from 'sharp';

export class WithdrawalDto {
  @ApiProperty({ required: true, type: String })
  @IsString()
  @IsNotEmpty()
  atmId: string;

  @ApiProperty({ required: false, type: Number })
  @IsNumber()
  @IsNotEmpty()
  pin: string;

  @ApiProperty({ required: false, type: Number })
  @IsString()
  @IsNotEmpty()
  amount: string;

  @ApiProperty({ required: false, type: Boolean })
  @IsBoolean()
  @IsOptional()
  cardJammed: boolean;
}

export class EndTransactionDto {
  @ApiProperty({ required: true, type: String })
  @IsString()
  @IsNotEmpty()
  atm: string;

  @ApiProperty({ required: false, type: Boolean })
  @IsBoolean()
  @IsOptional()
  simulateCardEjectFailure: boolean;
}
