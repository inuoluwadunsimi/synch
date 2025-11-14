import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { JwtModule } from '@nestjs/jwt';
import * as dotenv from 'dotenv';
import { LoggerModule } from './modules/logger/logger.module';
import { Secrets } from './resources/secrets';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { HttpExceptionFilter } from './filters/http.exception.filter';
import { GlobalResponseInterceptor } from './interceptors/response.interceptor';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { MailerModule } from '@nestjs-modules/mailer';
import { UserModule } from './modules/user/user.module';
import { AuthModule } from './modules/auth/auth.module';
import { BankModule } from './modules/bank/bank.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { NotificationsModule } from './modules/notifcation/notification.module';
import { SdkModule } from './modules/atm-sdk/sdk.module';
import { SeederModule } from './modules/seeder/seeder.module';
import { AdminModule } from './modules/admin/admin.module';
import { TypeOrmModule } from '@nestjs/typeorm';

dotenv.config();

@Module({
  imports: [
    MongooseModule.forRoot(process.env[Secrets.MONGODB_URI] as string),
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    JwtModule.register({ secret: process.env[Secrets.JWT_PRIVATE_KEY] }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    MailerModule.forRootAsync({
      useFactory: (configService: ConfigService) => ({
        transport: {
          service: 'gmail',
          auth: {
            user: configService.get<string>(Secrets.MAIL_USER),
            pass: configService.get<string>(Secrets.GMAIL_PASS),
          },
        },
        defaults: {
          from: configService.get<string>(Secrets.MAIL_USER),
        },
      }),
      inject: [ConfigService],
    }),
    // TypeOrmModule.forRoot({
    //   type: 'postgres',
    //   host: 'localhost',
    //   port: 5432,
    //   username: 'inuoluwadunsimi',
    //   password: 'postgres',
    //   database: 'metrics',
    //   // entities: [LivenessEvent],
    //   synchronize: true, // disable in production
    // }),

    LoggerModule,
    UserModule,
    AuthModule,
    BankModule,
    TasksModule,
    NotificationsModule,
    SdkModule,
    SeederModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: GlobalResponseInterceptor,
    },
  ],
})
export class AppModule {}
