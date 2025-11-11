import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsSemVer,
  IsString,
  IsStrongPassword,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { UserRole } from '../../user/interfaces/enums/user.enums';
import { Type } from 'class-transformer';
import { GeolocationDTO } from '../../bank/dtos/atm.dto';

export class SignupDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email must not be empty' })
  @ApiProperty({ example: 'hello@useglouse.com', required: true })
  email: string;

  @ApiProperty({
    description: 'phoneNumber',
  })
  @IsString()
  @IsOptional()
  phoneNumber: string;

  @ApiProperty({
    description: 'firstName',
  })
  @IsString()
  @IsOptional()
  firstName: string;

  @ApiProperty({
    description: 'firstName',
  })
  @IsString()
  @IsOptional()
  lastName: string;

  @ApiProperty({
    description: 'firstName',
    enum: UserRole,
    required: true,
  })
  @IsString()
  @IsEnum(UserRole)
  @IsNotEmpty()
  role: UserRole;

  @IsOptional()
  @ApiProperty({ required: false, type: GeolocationDTO })
  @Type(() => GeolocationDTO)
  geolocation?: GeolocationDTO;
}

export class LoginDto {
  @IsEmail()
  @IsNotEmpty({ message: 'Email must not be empty' })
  @ApiProperty({ example: 'hello@useglouse.com', required: true })
  email: string;
}
