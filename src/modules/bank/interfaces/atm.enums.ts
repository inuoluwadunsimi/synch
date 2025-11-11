export enum AtmHealthStatus {
  HEALTHY = ' healthy',
  DEGRADED = 'degraded',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export enum AtmActivityStatus {
  ONLINE = 'online',
  OFFLINE = 'offline',
}

export enum AtmTransactionType {
  WITHDRAWAL = 'withdrawal',
  REFILL = 'refill',
}
