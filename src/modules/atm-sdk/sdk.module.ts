import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Global, Module } from '@nestjs/common';
import { BankModule } from '../bank/bank.module';
import { SdkController } from './sdk.controller';
import { SdkService } from './sdk.service';
import { TasksModule } from '../tasks/tasks.module';

@Module({
  imports: [BankModule, TasksModule],
  controllers: [SdkController],
  providers: [SdkService],
})
export class SdkModule {}
