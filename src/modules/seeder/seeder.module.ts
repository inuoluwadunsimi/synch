import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksLogsSeeder } from './tasks.seeder';
import { TasksLogs, TasksLogsSchema } from '../tasks/schemas/tasks.logs.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { ATM, ATMSchema } from '../bank/schemas/atm.schema';

@Module({
  imports: [
    // Connect to your DB (you'll use your standard ConfigModule/Mongoose.forRoot)
    // For simplicity, assuming these are the models you need to inject:
    MongooseModule.forFeature([
      { name: TasksLogs.name, schema: TasksLogsSchema },
      { name: User.name, schema: UserSchema },
      { name: ATM.name, schema: ATMSchema },
    ]),
  ],
  providers: [TasksLogsSeeder],
  exports: [TasksLogsSeeder],
})
export class SeederModule {}
