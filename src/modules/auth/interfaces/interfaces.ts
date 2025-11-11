// details needed to generate a token
import { UserRole } from '../../user/interfaces/enums/user.enums';

export interface GenerateTokenParam {
  email?: string;
  userId?: string;
  role?: UserRole;
}

export interface IUser {
  email: string;
  userId: string;
  role: UserRole;
}

export interface IExpressRequest extends Request {
  userId?: string;
  email?: string;
  role: UserRole;
}
