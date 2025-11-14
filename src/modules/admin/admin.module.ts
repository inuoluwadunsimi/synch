import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Global, Module } from '@nestjs/common';
import { BankModule } from '../bank/bank.module';
import { TasksModule } from '../tasks/tasks.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [BankModule, TasksModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
