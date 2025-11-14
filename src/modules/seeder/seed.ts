import { NestFactory } from '@nestjs/core';
import { SeederModule } from './seeder.module'; // Adjust path
import { TasksLogsSeeder } from './tasks.seeder'; // Adjust path

import * as dotenv from 'dotenv';
import { AtmCashAndTransactionSeeder } from './atm-seeder';
dotenv.config();

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(SeederModule);
    const seeder = app.get(AtmCashAndTransactionSeeder);

    console.log('🚀 Starting TasksLogs Seeder...');
    await seeder.seed();
    console.log('🎉 Seeding complete!');

    await app.close();
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  }
}

bootstrap();
