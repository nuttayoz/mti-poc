import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggingModule } from './common/logging/logging.module';
import { ConfigModule } from './config/config.module';
import { GoogleModule } from './google/google.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    LoggingModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    GoogleModule,
    HealthModule,
    JobsModule,
  ],
})
export class AppModule {}
