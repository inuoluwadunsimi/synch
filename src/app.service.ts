import { Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  @Cron(CronExpression.EVERY_30_SECONDS) // Every 2 minutes
  handleKeepAlive() {
    const env = this.configService.get('NODE_ENV');

    // Only run in dev environment
    if (env === 'development' || env === 'dev') {
      console.log('render keep alive');
    }
  }
}
