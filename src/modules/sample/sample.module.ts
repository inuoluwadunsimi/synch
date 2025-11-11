import { Module, Global } from '@nestjs/common';
import { SampleController } from './sample.controller';
import { SampleRepository } from './sample.repository';
import { SampleService } from './sample.service';

@Global()
@Module({
  providers: [SampleRepository, SampleService],
  exports: [],
  controllers: [SampleController],
})
export class SampleModule {}
