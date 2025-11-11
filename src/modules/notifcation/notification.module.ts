import { Module, Global, forwardRef } from '@nestjs/common';

import { NotificationService } from "./notification.service";

@Global()
@Module({
  imports: [],
  providers: [NotificationService],
  exports: [NotificationService], // This exports the service
})
export class NotificationsModule {}
