import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Global, Module } from '@nestjs/common';
import { BankController } from './bank.controller';
import { BankRepository } from './bank.repository';
import { BankService } from './bank.service';
import { ATM, ATMSchema } from './schemas/atm.schema';
import {
  AtmTransaction,
  AtmTransactionSchema,
} from './schemas/atm.transaction';
import {
  AtmCashInventory,
  AtmCashInventorySchema,
} from './schemas/atm.cash.inventory';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ATM.name, schema: ATMSchema },
      { name: AtmTransaction.name, schema: AtmTransactionSchema },
      { name: AtmCashInventory.name, schema: AtmCashInventorySchema },
    ]),
  ],
  controllers: [BankController],
  providers: [BankRepository, BankService],
  exports: [BankRepository, BankService],
})
export class BankModule {}
