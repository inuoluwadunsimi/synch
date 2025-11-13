export enum TaskStatusEnums {
  FIXED = 'FIXED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  UNRESOLVED = 'UNRESOLVED',
  IN_PROGRESS = 'INPROGRESS',
}

export const allowedTransitions: {
  [key in TaskStatusEnums]: TaskStatusEnums[];
} = {
  [TaskStatusEnums.ASSIGNED]: [
    TaskStatusEnums.IN_PROGRESS,
    TaskStatusEnums.REASSIGNED,
    TaskStatusEnums.UNRESOLVED,
  ],
  [TaskStatusEnums.IN_PROGRESS]: [
    TaskStatusEnums.FIXED,
    TaskStatusEnums.REASSIGNED,
    TaskStatusEnums.UNRESOLVED,
  ],
  [TaskStatusEnums.REASSIGNED]: [],
  [TaskStatusEnums.FIXED]: [],
  [TaskStatusEnums.UNRESOLVED]: [],
};

export enum TaskTitle {
  NETWORK_OUTAGE = 'network outage',

  LOW_CASH = 'low cash',
  CARD_RETAINED = 'card retained',
  CARD_JAMMED = 'card jammed',
  CARD_EJECT_FAILURE = 'card eject failure',
  CASH_JAMMED = 'cash jammed',
}

export enum TaskType {
  SOFTWARE = 'SOFTWARE',
  HARDWARE = 'HARDWARE',
}
