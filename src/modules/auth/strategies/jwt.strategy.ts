import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  GenerateTokenParam,
  IExpressRequest,
  IUser,
} from '../interfaces/interfaces';
import { UserRepository } from '../../user/user.repository';
import { Secrets } from '../../../resources/secrets';
// import { RedisService } from "../../redis/redis.service";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private readonly userRepository: UserRepository,
    // private readonly redisService: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromHeader('x-auth-token'),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>(Secrets.JWT_PRIVATE_KEY),
      passReqToCallback: true,
    });
  }

  async validate(req: IExpressRequest, payload: GenerateTokenParam) {
    const token = req.headers['x-auth-token'] as string;

    req.userId = payload.userId;
    req.role = payload.role;
    req.email = payload.email;

    return payload as GenerateTokenParam;
  }
}
