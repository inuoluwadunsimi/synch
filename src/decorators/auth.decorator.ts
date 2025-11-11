import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IExpressRequest, IUser } from '../modules/auth/interfaces/interfaces';

export const Auth = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = context.switchToHttp();
    const req: IExpressRequest = ctx.getRequest();
    return {
      email: req.email,
      userId: req.userId,
      role: req.role,
    } as IUser;
  },
);
