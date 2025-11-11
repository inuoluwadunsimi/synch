import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Put,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SignupDto } from './dto/signup.dto';
import { AuthResponse } from './interfaces/auth.responses';

@Controller('user')
@ApiTags('user')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'user signup' })
  @ApiResponse({ status: 200, type: AuthResponse })
  @Post('signup')
  public async signup(@Body() body: SignupDto) {
    return await this.authService.signup(body);
  }

  @ApiOperation({ summary: 'user login' })
  @ApiResponse({ status: 200, type: AuthResponse })
  @Post('login')
  public async login(@Body() body: SignupDto) {
    return await this.authService.signup(body);
  }
}
