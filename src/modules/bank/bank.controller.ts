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
import { BankService } from './bank.service';
import { CreateATMDto } from './dtos/atm.dto';
import { ATM } from './schemas/atm.schema';
import { AtmActivityStatus, AtmHealthStatus } from './interfaces/atm.enums';
import { GetATMQuery } from './interfaces/atm.interfaces';
import { BaseQuery } from '../../resources/interfaces';

@Controller('bank')
@ApiTags('bank')
@UseGuards(JwtAuthGuard)
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @Post('atm')
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'atm created successfully',
    type: ATM,
  })
  public async createAtm(@Body() body: CreateATMDto) {
    return await this.bankService.createAtm(body);
  }

  @Get('atm')
  @ApiResponse({
    status: HttpStatus.OK,
    description: " 'Get all atms successfully",
    type: ATM,
  })
  @ApiQuery({
    name: 'activityStatus',
    required: false,
    enum: AtmActivityStatus,
  })
  @ApiQuery({
    name: 'healthStatus',
    required: false,
    enum: AtmHealthStatus,
  })
  public async getAllAtms(
    @Query() filter: GetATMQuery,
    @Query() query: BaseQuery,
  ) {
    return await this.bankService.getAllAtms(filter, query);
  }

  @Get('atm/:id')
  @ApiResponse({
    status: HttpStatus.OK,
    description: " 'Get all atms successfully",
    type: ATM,
  })
  @ApiQuery({
    name: 'activityStatus',
    required: false,
    enum: AtmActivityStatus,
  })
  @ApiQuery({
    name: 'healthStatus',
    required: false,
    enum: AtmHealthStatus,
  })
  public async getAtmData(
    @Query() filter: GetATMQuery,
    @Query() query: BaseQuery,
  ) {
    return await this.bankService.getAllAtms(filter, query);
  }
}
