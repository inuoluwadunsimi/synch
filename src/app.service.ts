import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  @Cron('*/2 * * * *') // Every 2 minutes
  handleKeepAlive() {
    const env = this.configService.get('NODE_ENV');

    // Only run in dev environment
    if (env === 'development' || env === 'dev') {
      console.log('render keep alive');
    }
  }
}
