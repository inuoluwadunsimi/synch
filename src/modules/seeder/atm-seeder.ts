import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Faker } from '@faker-js/faker';
import moment from 'moment';

import { ATM, AtmDocument } from '../bank/schemas/atm.schema'; // Adjust path
import {
  AtmCashInventory,
  AtmCashInventoryDocument,
} from '../bank/schemas/atm.cash.inventory';
import {
  AtmTransaction,
  AtmTransactionDocument,
} from '../bank/schemas/atm.transaction'; // Adjust path
import { AtmTransactionType } from '../bank/interfaces/atm.enums';

const INITIAL_CASH_1000 = 15000;
const INITIAL_CASH_500 = 8000;
const INITIAL_CASH_200 = 5000;

// Total Initial Cash = 20,000,000

@Injectable()
export class AtmCashAndTransactionSeeder {
  constructor(
    @InjectModel(ATM.name)
    private readonly atmModel: Model<AtmDocument>,
    @InjectModel(AtmCashInventory.name)
    private readonly inventoryModel: Model<AtmCashInventoryDocument>,
    @InjectModel(AtmTransaction.name)
    private readonly transactionModel: Model<AtmTransactionDocument>,
  ) {}

  /**
   * Generates a single withdrawal transaction, ensuring cash levels are respected.
   */
  private generateWithdrawal(
    faker: Faker,
    atmId: string,
    currentInventory: AtmCashInventory,
    date: Date,
  ): AtmTransaction | null {
    // 50% chance of a low-value withdrawal, 50% chance of a high-value one
    const amount = faker.helpers.arrayElement([
      // Low value (2,000 - 10,000)
      faker.number.int({ min: 2, max: 10 }) * 1000,
      // High value (15,000 - 40,000)
      faker.number.int({ min: 15, max: 40 }) * 1000,
    ]);

    // Check if the ATM has enough cash in total
    if (currentInventory.totalAmount < amount) {
      return null; // ATM is out of cash for this transaction
    }

    let n1000 = 0;
    let n500 = 0;
    let n200 = 0;
    let remainingAmount = amount;

    // Greedy algorithm for note dispensing (prioritize 1000s)
    // 1000 notes
    const needed1000 = Math.floor(remainingAmount / 1000);
    n1000 = Math.min(needed1000, currentInventory.n1000);
    remainingAmount -= n1000 * 1000;

    // 500 notes
    const needed500 = Math.floor(remainingAmount / 500);
    n500 = Math.min(needed500, currentInventory.n500);
    remainingAmount -= n500 * 500;

    // 200 notes
    const needed200 = Math.floor(remainingAmount / 200);
    n200 = Math.min(needed200, currentInventory.n200);
    remainingAmount -= n200 * 200;

    // If we managed to dispense the exact amount
    if (remainingAmount === 0) {
      return {
        _id: faker.string.uuid(),
        atm: atmId,
        totalAmount: amount,
        n1000: n1000,
        n500: n500,
        n200: n200,
        transactionType: AtmTransactionType.WITHDRAWAL,
        createdAt: date,
        updatedAt: date,
      } as AtmTransaction;
    }

    return null; // Could not dispense with available notes (e.g., remainingAmount is 100)
  }

  /**
   * Main seeding logic
   */
  async seed(): Promise<void> {
    const { faker } = await import('@faker-js/faker');

    // 1. Clear existing data
    await this.inventoryModel.deleteMany({});
    await this.transactionModel.deleteMany({});
    console.log('🗑️ Cleared existing ATM Inventory and Transaction data.');

    // 2. Fetch ATM IDs
    const atmDocs = await this.atmModel.find({}, { _id: 1 }).limit(10).lean();
    if (atmDocs.length === 0) {
      console.error(
        '🛑 ERROR: No ATMs found. Please seed ATM collection first.',
      );
      return;
    }
    const atmIds = atmDocs.map((a) => a._id);
    const numATMs = atmIds.length;
    console.log(`Found ${numATMs} ATMs. Starting simulation...`);

    // --- Time setup (Last 2 months) ---
    const endDate = moment().startOf('day');
    const startDate = moment(endDate).subtract(2, 'months');
    const currentDate = moment(startDate);

    const allTransactions: AtmTransaction[] = [];
    const allInventories: AtmCashInventory[] = [];
    const currentCash: Map<string, AtmCashInventory> = new Map();

    // Initialize cash inventory for all ATMs
    atmIds.forEach((id) => {
      currentCash.set(id, {
        atm: id,
        totalAmount:
          INITIAL_CASH_1000 * 1000 +
          INITIAL_CASH_500 * 500 +
          INITIAL_CASH_200 * 200,
        n1000: INITIAL_CASH_1000,
        n500: INITIAL_CASH_500,
        n200: INITIAL_CASH_200,
      } as AtmCashInventory);
    });

    // 3. Simulate Daily Activity over 2 Months
    while (currentDate.isSameOrBefore(endDate, 'day')) {
      const date = currentDate.toDate();

      atmIds.forEach((atmId) => {
        const atmCash = currentCash.get(atmId)!;
        const transactionsForDay: AtmTransaction[] = [];

        // Simulate a random number of daily transactions (0 to 25)
        const numTransactions = faker.number.int({ min: 0, max: 25 });

        for (let t = 0; t < numTransactions; t++) {
          // Add a random timestamp throughout the day
          const transactionTime = moment(date)
            .add(faker.number.int({ min: 0, max: 23 }), 'hours')
            .add(faker.number.int({ min: 0, max: 59 }), 'minutes')
            .toDate();

          const transaction = this.generateWithdrawal(
            faker,
            atmId,
            atmCash,
            transactionTime,
          );

          if (transaction) {
            transactionsForDay.push(transaction);

            // Update cash inventory based on successful transaction
            atmCash.totalAmount -= transaction.totalAmount;
            atmCash.n1000 -= transaction.n1000;
            atmCash.n500 -= transaction.n500;
            atmCash.n200 -= transaction.n200;
          }
        }

        // --- End of Day Cash Inventory Log ---
        // Log the inventory *after* all transactions for the day
        const endOfDayInventory: AtmCashInventory = {
          _id: faker.string.uuid(),
          atm: atmId,
          totalAmount: atmCash.totalAmount,
          n1000: atmCash.n1000,
          n500: atmCash.n500,
          n200: atmCash.n200,
          createdAt: moment(date).endOf('day').toDate(),
          updatedAt: moment(date).endOf('day').toDate(),
        } as AtmCashInventory;

        allInventories.push(endOfDayInventory);
        allTransactions.push(...transactionsForDay);

        // --- Daily Replenishment Simulation ---
        // 50% chance of a cash loading if total cash is below 25% of initial total
        const initialTotal =
          INITIAL_CASH_1000 * 1000 +
          INITIAL_CASH_500 * 500 +
          INITIAL_CASH_200 * 200;
        if (
          atmCash.totalAmount < initialTotal * 0.25 &&
          faker.datatype.boolean()
        ) {
          // Replenish to 90% capacity
          atmCash.n1000 = Math.max(atmCash.n1000, INITIAL_CASH_1000 * 0.9);
          atmCash.n500 = Math.max(atmCash.n500, INITIAL_CASH_500 * 0.9);
          atmCash.n200 = Math.max(atmCash.n200, INITIAL_CASH_200 * 0.9);
          atmCash.totalAmount =
            atmCash.n1000 * 1000 + atmCash.n500 * 500 + atmCash.n200 * 200;

          // Add a cash load transaction
          const cashLoadTransaction: AtmTransaction = {
            _id: faker.string.uuid(),
            atm: atmId,
            totalAmount: initialTotal - atmCash.totalAmount, // Rough estimate of load amount
            n1000: atmCash.n1000,
            n500: atmCash.n500,
            n200: atmCash.n200,
            transactionType: AtmTransactionType.REFILL,
            createdAt: moment(date)
              .add(faker.number.int({ min: 10, max: 12 }), 'hours')
              .toDate(),
            updatedAt: moment(date)
              .add(faker.number.int({ min: 10, max: 12 }), 'hours')
              .toDate(),
          } as AtmTransaction;
          allTransactions.push(cashLoadTransaction);
        }
      });

      currentDate.add(1, 'day'); // Move to the next day
    }

    // 4. Insert data
    await this.inventoryModel.insertMany(allInventories);
    await this.transactionModel.insertMany(allTransactions);

    console.log(
      `✅ Successfully seeded ${allInventories.length} Inventory Logs and ${allTransactions.length} Transactions over 2 months.`,
    );
  }
}
