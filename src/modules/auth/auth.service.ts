import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { UserRepository } from '../user/user.repository';
import { LoginDto, SignupDto } from './dto/signup.dto';
import { GenerateTokenParam } from './interfaces/interfaces';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Secrets } from '../../resources/secrets';
import { AuthResponse } from './interfaces/auth.responses';

@Injectable()
export class AuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  public async signup(body: SignupDto): Promise<AuthResponse> {
    const { email } = body;
    const existingUser = await this.userRepository.getUser({ email });
    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }
    const lng = parseFloat(body.geolocation.longitude);
    const lat = parseFloat(body.geolocation.latitude);
    const newUser = await this.userRepository.createUser({
      ...body,
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    });
    const token = await this.generateToken({
      userId: newUser._id,
      email: newUser.email,
      role: newUser.role,
    });
    return {
      user: newUser,
      token,
    };
  }

  private async generateToken(body: GenerateTokenParam) {
    return this.jwtService.sign(body, {
      expiresIn: '7d',
      secret: this.configService.get(Secrets.JWT_PRIVATE_KEY),
    });
  }

  public async login(body: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepository.getUser({ email: body.email });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const token = await this.generateToken({
      userId: user._id,
      email: user.email,
      role: user.role,
    });
    return {
      user,
      token,
    };
  }
}
