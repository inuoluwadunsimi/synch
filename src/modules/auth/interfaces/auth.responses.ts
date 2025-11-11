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
import { User, UserDocument } from '../../user/schemas/user.schema';

export class AuthResponse {
  @ApiProperty({
    description: 'authentication token',
  })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'user data',
    type: User,
  })
  @IsOptional()
  user: UserDocument;
}
