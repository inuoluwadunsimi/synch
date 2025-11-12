export enum TaskStatusEnums {
  FIXED = 'FIXED',
  ASSIGNED = 'ASSIGNED',
  REASSIGNED = 'REASSIGNED',
  UNRESOLVED = 'UNRESOLVED',
  IN_PROGRESS = 'INPROGRESS',
}

export enum TaskTitle {
  NETWORK_OUTAGE = 'network outage',
  CONFIGURATION_ISSUE = 'configuration issue',
  TRANSACTION_FAILURE = 'transaction failure',
  SSL_EXPIRED = 'ssl expired',
  MEMORY_FULL = 'memory full',
  CASH_DISPENSER_JAMMED = 'cash dispenser jammed',
  PRINTER_JAMMED = 'printer jammed',
  LOW_CASH = 'low cash',
  CARD_RETAINED = 'card retained',
  MALWARE_DETECTED = 'malware detected',
}

export enum TaskType {
  SOFTWARE = 'SOFTWARE',
  HARDWARE = 'HARDWARE',
}
