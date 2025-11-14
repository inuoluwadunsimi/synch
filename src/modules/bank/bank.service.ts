import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BankRepository } from './bank.repository';
import { CreateATMDto } from './dtos/atm.dto';
import { GetATMQuery } from './interfaces/atm.interfaces';
import { BaseQuery } from '../../resources/interfaces';
import { TasksRepository } from '../tasks/tasks.repository';
import { AtmActivityStatus, AtmHealthStatus } from './interfaces/atm.enums';
import { ActivityStatus } from '../user/schemas/user.schema';

@Injectable()
export class BankService {
  constructor(
    private readonly bankRepository: BankRepository,
    private readonly tasksRepository: TasksRepository,
  ) {}

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
    const skip = (query.page - 1) * query.limit;
    const { activityStatus, healthStatus } = filter;
    const atmFilter: any = {};
    if (activityStatus) atmFilter.activityStatus = activityStatus;
    if (healthStatus) atmFilter.healthStatus = healthStatus;

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const atmsWithUptime = await this.bankRepository.atmAggregation([
      { $match: atmFilter },
      {
        $lookup: {
          from: 'issuelogs', // 👈 name of your issue logs collection
          localField: '_id',
          foreignField: 'atm',
          as: 'issueLogs',
          pipeline: [
            {
              $match: {
                time: { $gte: twentyFourHoursAgo, $lte: new Date() },
              },
            },
            { $sort: { time: 1 } },
          ],
        },
      },
      {
        $addFields: {
          totalLogs: { $size: '$issueLogs' },
          healthyLogs: {
            $size: {
              $filter: {
                input: '$issueLogs',
                cond: { $eq: ['$$this.healthStatus', 'healthy'] },
              },
            },
          },
        },
      },
      {
        $addFields: {
          uptimePercentage: {
            $cond: [
              { $eq: ['$totalLogs', 0] },
              100, // if no logs, assume 100%
              {
                $multiply: [{ $divide: ['$healthyLogs', '$totalLogs'] }, 100],
              },
            ],
          },
        },
      },
      {
        $addFields: {
          uptime: {
            last24Hours: {
              $divide: [{ $multiply: ['$uptimePercentage', 24] }, 100],
            },
            percentage: '$uptimePercentage',
          },
        },
      },
      {
        $project: {
          issueLogs: 0, // omit heavy log array
          totalLogs: 0,
          healthyLogs: 0,
          uptimePercentage: 0,
        },
      },
      ...(query?.sort ? [{ $sort: query.sort }] : []),
      ...(query?.limit ? [{ $limit: query.limit }] : []),
      ...(skip ? [{ $skip: skip }] : []),
    ]);
    console.log(atmsWithUptime);
    return atmsWithUptime;

    // const { activityStatus, healthStatus } = filter;
    //
    // const atmFilter: any = {};
    // if (activityStatus) {
    //   atmFilter.activityStatus = activityStatus;
    // }
    // if (healthStatus) {
    //   atmFilter.healthStatus = healthStatus;
    // }
    //
    // const atms = await this.bankRepository.getAtms({
    //   filter: atmFilter,
    //   query,
    // });
    // console.log(atms);
    //
    // const atmsList = Array.isArray(atms) ? atms : atms.data;
    //
    // const twentyFourHoursAgo = new Date();
    // twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    //
    // const atmsWithUptime = await Promise.all(
    //   atmsList.map(async (atmDoc) => {
    //     const atm = atmDoc.toObject();
    //     console.log(atm);
    //     const issueLogs = await this.tasksRepository.getIssueLogs({
    //       filter: {
    //         atm: atm._id,
    //         time: {
    //           $gte: twentyFourHoursAgo,
    //           $lte: new Date(),
    //         },
    //       },
    //       query: {
    //         sort: { time: 1 },
    //       },
    //     });
    //
    //     let uptimeHours = 24; // Default to full uptime
    //     if (Array.isArray(issueLogs) && issueLogs.length > 0) {
    //       const healthyLogs = issueLogs.filter(
    //         (log) => log.healthStatus === AtmHealthStatus.HEALTHY,
    //       );
    //       const uptimePercentage =
    //         (healthyLogs.length / issueLogs.length) * 100;
    //       uptimeHours = (uptimePercentage / 100) * 24;
    //     }
    //
    //     return {
    //       ...atm,
    //       uptime: {
    //         last24Hours: uptimeHours,
    //         percentage: (uptimeHours / 24) * 100,
    //       },
    //     };
    //   }),
    // );
    // Return in the same format as received (paginated or array)
    // if (Array.isArray(atms)) {
    //   return atmsWithUptime;
    // } else {
    //   return {
    //     ...atms,
    //     data: atmsWithUptime,
    //   };
    // }
  }

  public async toggleOnlineStatus(atmId: string, status: AtmActivityStatus) {
    console.log(atmId, status);
    const newatm = await this.bankRepository.updateAtm(
      { _id: atmId },
      { activitySatus: status },
    );
    console.log(newatm);

    return newatm;
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

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const issueLogs = await this.tasksRepository.getIssueLogs({
      filter: {
        atm: atmId,
        time: {
          $gte: twentyFourHoursAgo,
          $lte: new Date(),
        },
      },
      query: {
        sort: { time: 1 },
      },
    });

    let uptimeHours = 0;
    if (Array.isArray(issueLogs) && issueLogs.length > 0) {
      const healthyLogs = issueLogs.filter(
        (log) => log.healthStatus === AtmHealthStatus.HEALTHY,
      );
      const uptimePercentage = (healthyLogs.length / issueLogs.length) * 100;
      uptimeHours = (uptimePercentage / 100) * 24;
    } else {
      // If no logs, assume full uptime
      uptimeHours = 24;
    }

    return {
      atm,
      cashInventory,
      uptime: {
        last24Hours: uptimeHours,
        percentage: (uptimeHours / 24) * 100,
      },
    };
  }
}
