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
  email: string;

  @ApiProperty({ required: true, type: String })
  @IsString()
  @IsOptional()
  atmId: string;

  @ApiProperty({ required: false, type: Number })
  @IsString()
  @IsOptional()
  pin: string;

  @ApiProperty({ required: false, type: Number })
  @IsString()
  @IsOptional()
  amount: string;

  @ApiProperty({ required: false, type: Boolean })
  @IsBoolean()
  @IsOptional()
  cardJammed: boolean;

  @ApiProperty({ required: false, type: Boolean })
  @IsBoolean()
  @IsOptional()
  cashJammed: boolean;
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
