import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { BankService } from '../bank/bank.service';
import {
  AtmActivityStatus,
  AtmHealthStatus,
  AtmTransactionType,
} from '../bank/interfaces/atm.enums';
import { AtmDocument } from '../bank/schemas/atm.schema';
import { BankRepository } from '../bank/bank.repository';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatusEnums, TaskTitle } from '../tasks/interface/tasks.enums';
import { WithdrawalDto } from './dtos/withdrawal.dto';

@Injectable()
export class SdkService {
  private readonly logger = new Logger(SdkService.name);
  private readonly wrongPinAttempts = new Map<string, number>();
  private readonly CORRECT_PIN = '1234';
  private readonly MAX_PIN_ATTEMPTS = 3;

  constructor(
    private readonly bankRepository: BankRepository,
    private readonly taskService: TasksService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  public async emitLiveness() {
    this.logger.log('Emitting liveness checks to online ATMs...');
    const onlineAtms = (await this.bankRepository.getAtms({
      filter: { activitySatus: AtmActivityStatus.ONLINE },
    })) as AtmDocument[];

    for (const atm of onlineAtms) {
      await this.bankRepository.updateAtm(
        { _id: atm.id },
        { lastLivenessAt: new Date(), healthStatus: AtmHealthStatus.HEALTHY },
      );

      this.logger.log(`ATM ${atm._id} sent liveness check ✅`);
    }
  }

  @Cron(CronExpression.EVERY_5_SECONDS)
  public async checkLiveness() {
    const atms = (await this.bankRepository.getAtms({
      filter: {},
    })) as AtmDocument[];

    const now = Date.now();
    for (const atm of atms) {
      const last = atm.lastLivenessAt
        ? new Date(atm.lastLivenessAt).getTime()
        : 0;
      const diff = now - last;
      console.log(diff);
      if (diff > 15 * 1000) {
        await this.updateHealth(atm, AtmHealthStatus.DEGRADED); // >15s since last ping
      } else if (diff > 10 * 1000) {
        await this.updateHealth(atm, AtmHealthStatus.CRITICAL); // >10s since last ping
      } else if (diff > 6 * 1000) {
        await this.updateHealth(atm, AtmHealthStatus.WARNING); // >5s since last ping
      } else {
        await this.updateHealth(atm, AtmHealthStatus.HEALTHY);
      }
    }
  }

  private async updateHealth(atm: AtmDocument, status: AtmHealthStatus) {
    if (atm.healthStatus !== status) {
      await this.bankRepository.updateAtm(
        { _id: atm.id },
        { healthStatus: status },
      );
    }

    if (status !== AtmHealthStatus.HEALTHY) {
      await this.taskService.registerIssueLogs({
        atm: atm.id,
        healthStatus: status,
        taskTitle: TaskTitle.NETWORK_OUTAGE,
        issueDescription: `ATM failed liveness check. Marked as ${status}`,
        status: TaskStatusEnums.ASSIGNED,
      });
    }
  }

  private calculateDenominations(
    amount: number,
    available: { n1000: number; n500: number; n200: number },
  ): { n1000: number; n500: number; n200: number } | null {
    let remaining = amount;
    const dispensed = { n1000: 0, n500: 0, n200: 0 };

    // Try to dispense 1000 notes first
    const n1000Count = Math.min(Math.floor(remaining / 1000), available.n1000);
    dispensed.n1000 = n1000Count;
    remaining -= n1000Count * 1000;

    // Then 500 notes
    const n500Count = Math.min(Math.floor(remaining / 500), available.n500);
    dispensed.n500 = n500Count;
    remaining -= n500Count * 500;

    // Finally 200 notes
    const n200Count = Math.min(Math.floor(remaining / 200), available.n200);
    dispensed.n200 = n200Count;
    remaining -= n200Count * 200;

    // If we couldn't dispense the exact amount, return null
    if (remaining > 0) {
      return null;
    }

    return dispensed;
  }

  public async withdrawCash(data: WithdrawalDto, user: string) {
    const { atmId, pin, amount, cardJammed, cashJammed } = data;
    const withdrawalAmount = parseFloat(amount);

    if (cardJammed) {
      await this.taskService.registerIssueLogs(
        {
          atm: atmId,
          healthStatus: AtmHealthStatus.CRITICAL,
          taskTitle: TaskTitle.CARD_JAMMED,
          issueDescription: 'Card jammed in ATM dispenser',
          status: TaskStatusEnums.ASSIGNED,
        },
        user,
      );

      this.logger.error(`Card jammed at ATM ${atmId}. Critical issue logged.`);

      return {
        success: false,
        message: 'Card jammed. Please contact bank support.',
      };
    }

    if (pin !== this.CORRECT_PIN) {
      const currentAttempts = this.wrongPinAttempts.get(atmId) || 0;
      const newAttempts = currentAttempts + 1;
      this.wrongPinAttempts.set(atmId, newAttempts);

      this.logger.warn(
        `Wrong PIN attempt ${newAttempts}/${this.MAX_PIN_ATTEMPTS} for ATM ${atmId}`,
      );

      if (newAttempts >= this.MAX_PIN_ATTEMPTS) {
        await this.taskService.registerIssueLogs(
          {
            atm: atmId,
            healthStatus: AtmHealthStatus.CRITICAL,
            taskTitle: TaskTitle.CARD_RETAINED,
            issueDescription: `Card retained after ${this.MAX_PIN_ATTEMPTS} consecutive wrong PIN attempts`,
            status: TaskStatusEnums.ASSIGNED,
          },
          user,
        );

        this.logger.error(
          `Card retained at ATM ${atmId} after ${this.MAX_PIN_ATTEMPTS} wrong PIN attempts`,
        );

        this.wrongPinAttempts.delete(atmId);

        throw new BadRequestException(
          'Card retained due to multiple wrong PIN attempts.',
        );
      }

      return {
        success: false,
        message: `Invalid PIN. ${this.MAX_PIN_ATTEMPTS - newAttempts} attempts remaining.`,
        attemptsRemaining: this.MAX_PIN_ATTEMPTS - newAttempts,
      };
    }

    this.wrongPinAttempts.delete(atmId);

    const latestCashInventory = await this.bankRepository.getCashInventory(
      { atm: atmId },
      { sort: { createdAt: -1 } },
    );

    if (!latestCashInventory) {
      this.logger.error(
        `No cash inventory found for ATM ${atmId}. Cannot process withdrawal.`,
      );

      await this.taskService.registerIssueLogs(
        {
          atm: atmId,
          healthStatus: AtmHealthStatus.WARNING,
          taskTitle: TaskTitle.LOW_CASH,
          issueDescription: `Insufficient cash in ATM. Available: ${latestCashInventory.totalAmount}, Requested: ${withdrawalAmount}`,
          status: TaskStatusEnums.ASSIGNED,
        },
        user,
      );

      return {
        success: false,
        message: 'Unable to process withdrawal. Please try another ATM.',
      };
    }

    if (latestCashInventory.totalAmount < withdrawalAmount) {
      console.log('kokokokoko');
      await this.taskService.registerIssueLogs(
        {
          atm: atmId,
          healthStatus: AtmHealthStatus.WARNING,
          taskTitle: TaskTitle.LOW_CASH,
          issueDescription: `Insufficient cash in ATM. Available: ${latestCashInventory.totalAmount}, Requested: ${withdrawalAmount}`,
          status: TaskStatusEnums.ASSIGNED,
        },
        user,
      );

      this.logger.error(
        `Low cash at ATM ${atmId}. Available: ${latestCashInventory.totalAmount}, Requested: ${withdrawalAmount}`,
      );

      return {
        success: false,
        message:
          'Insufficient cash available. Please try a smaller amount or another ATM.',
      };
    }

    const denominationBreakdown = this.calculateDenominations(
      withdrawalAmount,
      {
        n1000: latestCashInventory.n1000,
        n500: latestCashInventory.n500,
        n200: latestCashInventory.n200,
      },
    );

    if (!denominationBreakdown) {
      this.logger.error(
        `Cannot dispense exact amount of ${withdrawalAmount} with available denominations at ATM ${atmId}`,
      );

      return {
        success: false,
        message:
          'Cannot dispense exact amount with available denominations. Please try a different amount.',
      };
    }

    // Create transaction record
    await this.bankRepository.createTransaction({
      atm: atmId,
      totalAmount: withdrawalAmount,
      n1000: denominationBreakdown.n1000,
      n500: denominationBreakdown.n500,
      n200: denominationBreakdown.n200,
      transactionType: AtmTransactionType.WITHDRAWAL,
    });

    // Update cash inventory
    const newInventory = {
      atm: atmId,
      totalAmount: latestCashInventory.totalAmount - withdrawalAmount,
      n1000: latestCashInventory.n1000 - denominationBreakdown.n1000,
      n500: latestCashInventory.n500 - denominationBreakdown.n500,
      n200: latestCashInventory.n200 - denominationBreakdown.n200,
    };

    await this.bankRepository.createCashInventory(newInventory);

    this.logger.log(
      `Successful withdrawal of ${amount} from ATM ${atmId}. Dispensed: ${denominationBreakdown.n1000}x1000, ${denominationBreakdown.n500}x500, ${denominationBreakdown.n200}x200`,
    );

    if (cashJammed) {
      await this.taskService.registerIssueLogs(
        {
          atm: atmId,
          healthStatus: AtmHealthStatus.CRITICAL,
          taskTitle: TaskTitle.CASH_JAMMED,
          issueDescription: 'Cash jammed in ATM dispenser',
          status: TaskStatusEnums.ASSIGNED,
        },
        user,
      );

      this.logger.error(`Cash  jammed at ATM ${atmId}. Critical issue logged.`);

      return {
        success: false,
        message: 'Cash jammed. Please contact bank support.',
      };
    }

    return {
      success: true,
      message: 'Withdrawal successful',
      amount,
      denominationBreakdown,
      remainingCash: newInventory.totalAmount,
    };
  }

  public async endTransaction(
    simulateCardEjectFailure: boolean,
    atm: string,
    user: string,
  ) {
    if (simulateCardEjectFailure) {
      this.logger.error(`Card ejection failed. Card retained in ATM.`);
      await this.taskService.registerIssueLogs(
        {
          atm: atm,
          healthStatus: AtmHealthStatus.CRITICAL,
          taskTitle: TaskTitle.CARD_EJECT_FAILURE,
          issueDescription: `Card ejection failed. Card retained in ATM.`,
          status: TaskStatusEnums.ASSIGNED,
        },
        user,
      );

      return {
        success: false,
        message: 'Card ejection failed.',
      };
    } else {
      this.logger.log(`Card ejected successfully from ATM.`);
      return {
        success: true,
        message: 'Card ejected successfully. Thank you for using our ATM.',
      };
    }
  }
}
