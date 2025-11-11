import { Response } from 'express';
import { HttpException } from '@nestjs/common';
import ValidationExceptions from 'src/exceptions/validations.exceptions';

function respond(res: Response, data: any, httpCode: number): void {
  res.setHeader('Content-Type', 'application/json');
  res.writeHead(httpCode);
  res.end(JSON.stringify(data));
}

export function success(res: Response, response: any, status = 200): void {
  respond(res, response, status);
}

export function failure(res: Response, response: any, httpCode = 503): void {
  const data = response;
  data.error = true;
  respond(res, data, httpCode);
}

export function handleError(res: Response, err: any) {
  console.error(err);
  let code = 500;
  let message = 'Internal Server Error Occurred';

  if (err instanceof HttpException || err instanceof ValidationExceptions) {
    code = err.getStatus();
    message = err.message;
  }
  failure(res, { message }, code);
}
