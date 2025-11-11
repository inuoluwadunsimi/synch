import { Controller, Get, Injectable } from '@nestjs/common';
import { AppService } from './app.service';
import { LoggerService } from './modules/logger/logger.service';

@Injectable()
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly loggerService: LoggerService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('/health')
  getHealth(): string {
    this.loggerService.info({
      message: 'server is up and running!',
      time: new Date().toISOString(),
    });
    return 'server is up and running!';
  }
}
