import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtModule, JwtService } from '@nestjs/jwt';

@Module({
  imports: [JwtModule],
  controllers: [AuthController],
  providers: [AuthService, JwtService],
  exports: [AuthService],
})
export class AuthModule {}
