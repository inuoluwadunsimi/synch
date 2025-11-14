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

@Controller('admin')
@ApiTags('admin')
export class AdminController {
  @ApiResponse({
    status: 200,
    description: 'dashboard data retrieved successfully',
  })
  @Get('dashboard')
  public async getDashboardData() {}
  // Admin controller methods would go here
}
