import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TasksLogsSeeder } from './tasks.seeder';
import { TasksLogs, TasksLogsSchema } from '../tasks/schemas/tasks.logs.schema';
import { User, UserSchema } from '../user/schemas/user.schema';
import { ATM, ATMSchema } from '../bank/schemas/atm.schema';
import { Secrets } from '../../resources/secrets';
import { AtmCashAndTransactionSeeder } from './atm-seeder';
import {
  AtmCashInventory,
  AtmCashInventorySchema,
} from '../bank/schemas/atm.cash.inventory';
import {
  AtmTransaction,
  AtmTransactionSchema,
} from '../bank/schemas/atm.transaction';

@Module({
  imports: [
    MongooseModule.forRoot(
      'mongodb+srv://Inuoluwadunsimi:Thesaneman12_@chat-app.8n2r2ot.mongodb.net/synch',
    ),

    // Connect to your DB (you'll use your standard ConfigModule/Mongoose.forRoot)
    // For simplicity, assuming these are the models you need to inject:
    MongooseModule.forFeature([
      { name: TasksLogs.name, schema: TasksLogsSchema },
      { name: User.name, schema: UserSchema },
      { name: ATM.name, schema: ATMSchema },
      { name: AtmCashInventory.name, schema: AtmCashInventorySchema },
      { name: AtmTransaction.name, schema: AtmTransactionSchema },
    ]),
  ],
  providers: [TasksLogsSeeder, AtmCashAndTransactionSeeder],
  exports: [TasksLogsSeeder, AtmCashAndTransactionSeeder],
})
export class SeederModule {}
