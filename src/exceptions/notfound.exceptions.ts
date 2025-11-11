import {
  ExceptionFilter,
  Catch,
  NotFoundException,
  HttpException,
  ArgumentsHost,
} from '@nestjs/common';

@Catch(NotFoundException)
export class NotFoundExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    response.status(404).json({
      statusCode: 404,
      timestamp: new Date().toISOString(),
      path: ctx.getRequest().url,
      message: 'Resource not found',
    });
  }
}
