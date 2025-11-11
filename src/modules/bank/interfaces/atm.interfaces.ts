import { AtmActivityStatus, AtmHealthStatus } from './atm.enums';

export interface GetATMQuery {
  activityStatus: AtmActivityStatus;
  healthStatus: AtmHealthStatus;
}
