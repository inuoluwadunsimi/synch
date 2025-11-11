import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '../../user/interfaces/enums/user.enums';
import { UserRepository } from '../../user/user.repository';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.get<string[]>(
      UserRole,
      context.getHandler(),
    );
    if (!requiredRoles) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const userDet = await this.userRepository.getUser({ _id: user.id });
    if (!userDet) {
      throw new UnauthorizedException('user not found');
    }

    const hasRole = requiredRoles.some((role) => userDet.role === role);
    if (!hasRole) {
      throw new UnauthorizedException('unauthorised user');
    }

    return true;
  }
}
