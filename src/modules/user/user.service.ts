import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from './user.repository';
import { UserRole } from './interfaces/enums/user.enums';
import { ActivityStatus } from './schemas/user.schema';

@Injectable()
export class UserService {
  constructor(private readonly userRepository: UserRepository) {}

  public async getUser(userId: string) {
    const user = await this.userRepository.getUser({ _id: userId });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  public async getUsers(role?: UserRole) {
    const filter = role ? { role } : {};
    return await this.userRepository.getUsers(filter);
  }

  public async toggleOnlineStatus(userId: string, status: ActivityStatus) {
    return await this.userRepository.updateUser(
      { _id: userId },
      { activityStatus: status },
    );
  }

  public async updateExpoToken(userId: string, expoToken: string) {
    await this.userRepository.updateUser({ _id: userId }, { expoToken });
  }
}
