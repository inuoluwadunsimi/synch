import {
  Catch,
  ArgumentsHost,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error(exception);

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal Server Error Occurred';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    }

    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      message = 'Internal Server Error Occurred';
    }

    response.status(status).json({ error: true, message });
  }
}
