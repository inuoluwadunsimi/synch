import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { MailerService } from '@nestjs-modules/mailer';
import { EmailInterface } from './interfaces/notification.interface';
import * as path from 'node:path';
import * as fs from 'fs';
import { Expo, ExpoPushMessage, ExpoPushReceipt } from 'expo-server-sdk';
import { TaskTitle } from '../tasks/interface/tasks.enums';
import { AtmHealthStatus } from '../bank/interfaces/atm.enums';

const templateDir = path.join(__dirname, 'templates');

export interface PushNotificationData {
  taskTitle: TaskTitle;
  atmId: string;
  taskId: string;
  status: AtmHealthStatus;
  token: string;
}

@Injectable()
export class NotificationService {
  private readonly client;
  private expo: Expo;

  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {
    this.expo = new Expo();
  }

  private async sendMail(body: EmailInterface) {
    try {
      await this.mailerService.sendMail(body);
    } catch (err) {
      console.log(err);
    }
  }

  public async sendOtpMail(body: {
    email: string;
    otp: string;
    name: string;
  }): Promise<void> {
    const { email, otp, name } = body;
    const templatePath = path.join(templateDir, 'otpEmail.html');
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    const html = templateSource.replace('{otp}', otp).replace('{name}', name);
    await this.sendMail({
      to: email,
      subject: 'OTP for registration',
      html: html,
    });
  }

  public async sendPushNotification(data: PushNotificationData): Promise<void> {
    if (!Expo.isExpoPushToken(data.token)) {
      console.error('Invalid Expo push token!');
      process.exit(1);
    }

    const chunks = this.expo.chunkPushNotifications([
      {
        to: data.token,
        priority: 'high',
        data: {
          screen: 'pager',
          message: 'Emergency alert triggered!',
          ...data,
        },
        title: '⚠️ Emergency Alert',
        body: 'Tap to view alert',
      },
    ]);

    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
  }
}
