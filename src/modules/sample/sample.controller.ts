import {
  Body,
  Controller,
  Headers,
  Post,
  Put,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IApiResponse } from '../../shared/response.type';

@Controller('sample')
@ApiTags('sample')
export class SampleController {}
