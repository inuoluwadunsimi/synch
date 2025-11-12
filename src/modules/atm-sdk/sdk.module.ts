import { MongooseModule } from '@nestjs/mongoose';
import { forwardRef, Global, Module } from '@nestjs/common';
import { BankModule } from '../bank/bank.module';

@Module({
  imports: [BankModule],
})
export class SdkModule {}
