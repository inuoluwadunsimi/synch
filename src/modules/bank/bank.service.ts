import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BankRepository } from './bank.repository';
import { CreateATMDto } from './dtos/atm.dto';
import { GetATMQuery } from './interfaces/atm.interfaces';
import { BaseQuery } from '../../resources/interfaces';

@Injectable()
export class BankService {
  constructor(private readonly bankRepository: BankRepository) {}

  public async createAtm(data: CreateATMDto) {
    const lng = parseFloat(data.geolocation.longitude);
    const lat = parseFloat(data.geolocation.latitude);
    const atm = await this.bankRepository.createAtm({
      location: {
        type: 'Point',
        coordinates: [lng, lat],
      },
    });

    await this.bankRepository.createCashInventory({
      atm: atm.id,
    });
  }

  public async getAllAtms(filter: GetATMQuery, query: BaseQuery) {
    const { activityStatus, healthStatus } = filter;

    const atmFilter: any = {};
    if (activityStatus) {
      atmFilter.activityStatus = activityStatus;
    }
    if (healthStatus) {
      atmFilter.healthStatus = healthStatus;
    }

    return await this.bankRepository.getAtms({
      filter: atmFilter,
      query,
    });
  }

  public async getAtmData(atmId: string) {
    const atm = await this.bankRepository.getAtm({ _id: atmId });
    if (!atm) {
      throw new NotFoundException('ATM not found');
    }

    const cashInventory = await this.bankRepository.getCashInventory(
      {
        atm: atmId,
      },
      { sort: { createdAt: -1 } },
    );

    //GET UPTIME DATA
  }
}
