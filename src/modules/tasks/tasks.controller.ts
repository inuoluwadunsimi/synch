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
import { JwtAuthGuard } from '../auth/guards/auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { TasksService } from './tasks.service';
import { Auth } from '../../decorators/auth.decorator';
import { Roles } from '../../decorators/roles.decorator';
import { IUser } from '../auth/interfaces/interfaces';
import { EngineerTasksEnums } from './interface/tasks.responses';
import { TasksLogs } from './schemas/tasks.logs.schema';
import { UserRole } from '../user/interfaces/enums/user.enums';
import { TaskStatusEnums } from './interface/tasks.enums';
import { ATM } from '../bank/schemas/atm.schema';
import { BaseQuery } from '../../resources/interfaces';
import { ChangeTaskStatusRequests } from './interface/tasks.requests';

@Controller('tasks')
@ApiTags('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get('engineer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get engineer tasks with optional date filtering' })
  @ApiQuery({
    name: 'status',
    enum: EngineerTasksEnums,
    required: true,
    description: 'Task status filter',
  })
  @ApiQuery({
    name: 'from',
    type: String,
    required: false,
    description: 'Start date filter (ISO 8601 format)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    type: String,
    required: false,
    description: 'End date filter (ISO 8601 format)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Engineer tasks retrieved successfully',
    type: [TasksLogs],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  async getEngineerTasks(
    @Auth() user: IUser,
    @Query('status') status: EngineerTasksEnums,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.tasksService.getEngineerTasks({
      user: user.userId,
      status,
      query: {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all tasks (Admin only) with optional filters' })
  @ApiQuery({
    name: 'assignee',
    type: String,
    required: false,
    description: 'Filter by assignee user ID',
  })
  @ApiQuery({
    name: 'atm',
    type: String,
    required: false,
    description: 'Filter by ATM ID',
  })
  @ApiQuery({
    name: 'status',
    enum: TaskStatusEnums,
    required: false,
    description: 'Filter by task status',
  })
  @ApiQuery({
    name: 'from',
    type: String,
    required: false,
    description: 'Start date filter (ISO 8601 format)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @ApiQuery({
    name: 'to',
    type: String,
    required: false,
    description: 'End date filter (ISO 8601 format)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @ApiQuery({
    name: 'page',
    type: Number,
    required: false,
    description: 'Page number for pagination',
    example: 1,
  })
  @ApiQuery({
    name: 'limit',
    type: Number,
    required: false,
    description: 'Number of items per page',
    example: 10,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Tasks retrieved successfully',
    type: [TasksLogs],
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized - Admin or Super Admin role required',
  })
  async getAllTasks(
    @Query('assignee') assignee?: string,
    @Query('atm') atm?: string,
    @Query('status') status?: TaskStatusEnums,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return await this.tasksService.getAllTasks({
      assignee,
      atm,
      status,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      query: {
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
      },
    });
  }

  @Get('atm/history/:atmId')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'atm created successfully',
    type: [TasksLogs],
  })
  public async getAtmFixHistory(
    @Param('atmId') atmId: string,
    @Query() query: BaseQuery,
  ) {
    return await this.tasksService.getAtmFixHsitory(query, atmId);
  }

  @Get(':taskId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single task by ID' })
  @ApiParam({
    name: 'taskId',
    type: String,
    description: 'Task ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task retrieved successfully',
    type: TasksLogs,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  async getTaskById(@Param('taskId') taskId: string) {
    return await this.tasksService.getTaskById(taskId);
  }

  @Patch(':taskId/status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Change task status' })
  @ApiParam({
    name: 'taskId',
    type: String,
    description: 'Task ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Task status updated successfully',
    type: TasksLogs,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  async changeTaskStatus(
    @Param('taskId') taskId: string,
    @Body() body: Omit<ChangeTaskStatusRequests, 'taskId'>,
  ) {
    return await this.tasksService.changeTaskStatus({
      taskId,
      ...body,
    });
  }

  @Get(':taskId/diagnostic-report')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate AI-powered diagnostic report for a task',
  })
  @ApiParam({
    name: 'taskId',
    type: String,
    description: 'Task ID',
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Diagnostic report generated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Task not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Unauthorized',
  })
  @UseGuards(JwtAuthGuard)
  public async generateAtmDiagnosticReport(@Param('taskId') taskId: string) {
    return await this.tasksService.generateDiagnosticReport(taskId);
  }
}
