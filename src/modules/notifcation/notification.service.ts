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

const templateDir = path.join(__dirname, 'templates');

@Injectable()
export class NotificationService {
  private readonly client;
  constructor(
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

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
}
