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
import { SdkService } from './sdk.service';
import { EndTransactionDto, WithdrawalDto } from './dtos/withdrawal.dto';

@Controller('sdk')
@ApiTags('ATM SDK')
export class SdkController {
  constructor(private readonly sdkService: SdkService) {}

  @Post('withdraw')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process ATM cash withdrawal' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Withdrawal processed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Withdrawal successful' },
        amount: { type: 'string', example: '5000' },
        denominationBreakdown: {
          type: 'object',
          properties: {
            n1000: { type: 'number', example: 4 },
            n500: { type: 'number', example: 2 },
            n200: { type: 'number', example: 0 },
          },
        },
        remainingCash: { type: 'number', example: 45000 },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Invalid request - Card jammed, wrong PIN, or insufficient cash',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: {
          type: 'string',
          example: 'Invalid PIN. 2 attempts remaining.',
        },
        attemptsRemaining: { type: 'number', example: 2 },
      },
    },
  })
  public async withdrawCash(@Body() withdrawalDto: WithdrawalDto) {
    return await this.sdkService.withdrawCash(withdrawalDto);
  }

  @Post('transaction/end')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Process ATM cash withdrawal' })
  public async endTransaction(@Body() body: EndTransactionDto) {
    return await this.sdkService.endTransaction(
      body.simulateCardEjectFailure,
      body.atm,
    );
  }
}
