import { Injectable, Logger } from '@nestjs/common';
import { BankService } from '../bank/bank.service';
import {
  AtmActivityStatus,
  AtmHealthStatus,
} from '../bank/interfaces/atm.enums';
import { AtmDocument } from '../bank/schemas/atm.schema';
import { BankRepository } from '../bank/bank.repository';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TasksService } from '../tasks/tasks.service';
import { TaskStatusEnums, TaskTitle } from '../tasks/interface/tasks.enums';

@Injectable()
export class SdkService {
  private readonly logger = new Logger(SdkService.name);

  constructor(
    private readonly bankService: BankService,
    private readonly bankRepository: BankRepository,
    private readonly taskService: TasksService,
  ) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  public async emitLiveness() {
    const onlineAtms = (await this.bankRepository.getAtms({
      filter: { activityStatus: AtmActivityStatus.ONLINE },
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
      if (diff > 15 * 1000) {
        await this.updateHealth(atm, AtmHealthStatus.DEGRADED);
      } else if (diff > 10 * 1000) {
        await this.updateHealth(atm, AtmHealthStatus.CRITICAL);
      } else if (diff > 5 * 60 * 1000) {
        await this.updateHealth(atm, AtmHealthStatus.WARNING);
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

    await this.taskService.registerIssueLogs({
      atm: atm.id,
      healthStatus: status,
      taskTitle: TaskTitle.NETWORK_OUTAGE,
      issueDescription: `ATM failed liveness check. Marked as ${status}`,
      status: TaskStatusEnums.ASSIGNED,
    });
  }
}
