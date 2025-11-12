import { AtmHealthStatus } from '../../bank/interfaces/atm.enums';
import { TaskStatusEnums, TaskTitle, TaskType } from './tasks.enums';

export interface CreateNewLog {
  atm: string;
  healthStatus: AtmHealthStatus;
  assignee?: string;
  taskTitle?: TaskTitle;
  taskType?: TaskType;
  issueDescription: string;
  status: TaskStatusEnums;
}
