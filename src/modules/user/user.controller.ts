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
  Query,
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
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { UserRole } from './interfaces/enums/user.enums';
import { User } from './schemas/user.schema';
import { Auth } from '../../decorators/auth.decorator';
import { IUser } from '../auth/interfaces/interfaces';
import { ToggleOnlineDto, UpdateDto } from './dtos/user.dtos';

@Controller('user')
@ApiTags('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get('/me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a user by ID' })
  @ApiParam({
    name: 'id',
    type: String,
    description: 'User ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User retrieved successfully',
    type: User,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'User not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  async getUser(@Auth() user: IUser) {
    return await this.userService.getUser(user.userId);
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get all users with optional role filter' })
  @ApiQuery({
    name: 'role',
    enum: UserRole,
    required: false,
    description: 'Filter users by role',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users retrieved successfully',
    type: [User],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin or Super Admin role required',
  })
  async getUsers(@Query('role') role?: UserRole) {
    return await this.userService.getUsers(role);
  }

  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Users status changed',
    type: User,
  })
  @ApiOperation({ summary: 'Get all users with optional role filter' })
  @Patch('status')
  public async toggleOnlineStatus(
    @Auth() user: IUser,
    @Body() body: ToggleOnlineDto,
  ) {
    return await this.userService.toggleOnlineStatus(
      user.userId,
      body.activityStatus,
    );
  }

  @ApiResponse({
    status: HttpStatus.OK,
    description: 'token updated',
    type: User,
  })
  @ApiOperation({ summary: 'Get all users with optional role filter' })
  @Patch('token')
  public async updateExpoToken(@Auth() user: IUser, @Body() body: UpdateDto) {
    return await this.userService.updateExpoToken(user.userId, body.expoToken);
  }
}
