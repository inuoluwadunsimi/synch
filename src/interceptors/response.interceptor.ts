import {
  CallHandler,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, map, throwError } from 'rxjs';
import { IApiResponse } from '../shared/response.type';
import { LoggerService } from '../modules/logger/logger.service';

@Injectable()
export class GlobalResponseInterceptor<T>
  implements NestInterceptor<T, IApiResponse<T>>
{
  constructor(private loggerService: LoggerService) {}
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<IApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const user = request.userId;
    const email = request.email;
    return next.handle().pipe(
      map((response: any) => {
        // Extract the message and data if they exist
        const message = response?.message || 'Request successful';
        const data = response?.data !== undefined ? response.data : response;

        return {
          message,
          statusCode: context.switchToHttp().getResponse().statusCode,
          data: data,
        } as IApiResponse<T>;
      }),
      catchError((err) =>
        throwError(() => this.handleError(err, request, user, email)),
      ),
    );
  }

  private handleError(
    err: any,
    request: any,
    user: string,
    email: string,
  ): HttpException {
    console.log(err);
    const statusCode = err.status || HttpStatus.INTERNAL_SERVER_ERROR;
    const message =
      statusCode >= 500
        ? 'Internal server error'
        : err.response?.message || err.message;



    if (statusCode >= 500) {
      this.loggerService.error({
        user,
        time: new Date().toISOString(),
        message: err.message,
        error: { stack: err.stack, url: request.url },
      });
    }

    return new HttpException({ message, statusCode, data: null }, statusCode);
  }
}
