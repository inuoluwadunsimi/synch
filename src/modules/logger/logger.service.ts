import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { configure, getLogger, Logger } from 'log4js';
import { logDetails } from './interface/error.interface';

// switch (level.toLowerCase()) {
//   case 'error':
//     return ':red_circle:';
//   case 'warn':
//     return ':warning:';
//   case 'info':
//     return ':information_source:';
//   case 'debug':
//     return ':bug:';
//   default:
//     return ':bell:';
// }
// }

export type LoggerLevel = 'off' | 'all' | 'debug' | 'info' | 'warn' | 'error';

export interface ILoggerOptions {
  id: string;
  level?: LoggerLevel;
}

@Injectable()
export class LoggerService {
  private logger: Logger;

  constructor(
    private configService: ConfigService,
  ) {
    this.initializeLogger();
  }

  private initializeLogger() {
    const options: ILoggerOptions = {
      id: this.configService.get<string>('NODE_ENV') || 'app',
      level: 'info',
    };

    configure({
      appenders: {
        [options.id]: { type: 'console', layout: { type: 'basic' } },
        file: { type: 'file', filename: `logs/${options.id}.log` },
      },
      categories: {
        default: { appenders: [options.id, 'file'], level: options.level },
      },
    });

    this.logger = getLogger(options.id);
  }

  info(details: logDetails): void {
    const message = this.formatLogMessage(details);
    this.logger.info(message);
  }

  async error(details: logDetails): Promise<void> {
    const message = this.formatLogMessage(details);
    this.logger.error(message);

  }

  warn(details: logDetails): void {
    const message = this.formatLogMessage(details);
    this.logger.warn(message);
  }

  debug(details: logDetails): void {
    const message = this.formatLogMessage(details);
    this.logger.debug(message);
  }

  private serializeMessage(message: any[]): string {
    return message
      .map((m) => (typeof m === 'object' ? JSON.stringify(m) : m))
      .join(' ');
  }

  private formatLogMessage(details: logDetails): string {
    const { user, time, message, error } = details;
    let formattedMessage = `[${time}]`;
    if (user) formattedMessage += ` [User: ${user}]`;
    formattedMessage += ` ${message}`;
    if (error) formattedMessage += `\nError: ${JSON.stringify(error)}`;
    return formattedMessage;
  }
}
