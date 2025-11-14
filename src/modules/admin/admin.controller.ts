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
import { AdminService } from './admin.service';

@Controller('admin')
@ApiTags('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}
  @ApiResponse({
    status: 200,
    description: 'dashboard data retrieved successfully',
  })
  @Get('dashboard')
  public async getDashboardData() {
    return await this.adminService.getDashboards();
  }

  @ApiResponse({
    status: 200,
    description: 'dashboard data retrieved successfully',
  })
  @Get('atms')
  public async getAtms() {
    return await this.adminService.getAtmsWithLatestCash();
  }
  // Admin controller methods would go here
}
