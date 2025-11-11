import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../modules/user/interfaces/enums/user.enums';

export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
