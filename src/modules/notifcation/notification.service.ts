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
import axios from 'axios';
import { Secrets } from '../../resources/secrets';

const templateDir = path.join(__dirname, 'templates');

export interface PushNotificationData {
  taskTitle: TaskTitle;
  atmId: string;
  taskId: string;
  status: AtmHealthStatus;
  token: string;
}

export interface SendTextWhatsappMessage {
  phoneNumber: string;
  content: string;
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
      return;
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
    console.log(chunks);

    const tickets = [];

    for (const chunk of chunks) {
      const ticketChunk = await this.expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    }
  }

  public async sendWhatsappMessage(
    body: SendTextWhatsappMessage,
  ): Promise<void> {
    const formattedPhoneNumber = body.phoneNumber.replace(/^0/, '234');

    const url = `https://graph.facebook.com/v15.0/${this.configService.get(Secrets.WHATSAPP_PHONE_NUMBER_ID)}/messages`;
    const headers = {
      Authorization: `Bearer ${this.configService.get(Secrets.WHATSAPP_ACCESS_TOKEN)}`,
      'Content-Type': 'application/json',
    };

    console.log(this.configService.get(Secrets.WHATSAPP_ACCESS_TOKEN));
    console.log(this.configService.get(Secrets.WHATSAPP_PHONE_NUMBER_ID));

    const data = {
      messaging_product: 'whatsapp',
      to: formattedPhoneNumber, // Full international format
      type: 'text',
      recipient_type: 'individual',
      text: {
        body: body.content,
      },
    };

    try {
      const response = await axios.post(url, data, { headers });

      console.log('Message sent:', response.data);
    } catch (error: any) {
      console.error(
        'Error sending message:',
        error.response ? error.response.data : error.message,
      );
      throw new Error('Error sending message');
    }
  }
}
