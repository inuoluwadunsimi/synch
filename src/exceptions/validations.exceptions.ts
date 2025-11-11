import { BadRequestException, ValidationError } from '@nestjs/common';

function transform(errors: ValidationError[]) {
  return errors.map((error) =>
    error.constraints ? Object.values(error.constraints) : [],
  );
}

export default class ValidationExceptions extends BadRequestException {
  constructor(public validationErrors: ValidationError[]) {
    super({
      error: 'ValidationError',
      message: transform(validationErrors).flat()[0],
    });
  }
}
