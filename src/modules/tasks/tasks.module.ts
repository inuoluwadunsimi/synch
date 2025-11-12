import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Global, Module } from '@nestjs/common';
import { TasksLogs, TasksLogsSchema } from './schemas/tasks.logs.schema';
import { StatusTrail, StatusTrailSchema } from './schemas/status.trail.schema';
import { IssueLogs, IssueLogsSchema } from './schemas/issue.logs.schema';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TasksRepository } from './tasks.repository';
import { BankModule } from '../bank/bank.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: TasksLogs.name, schema: TasksLogsSchema },
      { name: StatusTrail.name, schema: StatusTrailSchema },
      { name: IssueLogs.name, schema: IssueLogsSchema },
    ]),
    forwardRef(() => BankModule),
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksRepository],
  exports: [TasksService, TasksRepository],
})
export class TasksModule {}
