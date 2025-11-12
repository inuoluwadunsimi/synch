import { ApiProperty } from '@nestjs/swagger';
import { TasksLogs, TasksLogsDocument } from '../schemas/tasks.logs.schema';

export enum EngineerTasksEnums {
  ACTIVE = 'ACTIVE',
  ASSIGNED = 'ASSIGNED',
  RESOLVED = 'RESOLVED',
  UNRESOLVED = 'UNRESOLVED',
  REASSIGNED = 'REASSIGNED',
}
