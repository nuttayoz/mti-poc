import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggingModule } from './common/logging/logging.module';
import { ConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { JobsModule } from './jobs/jobs.module';

@Module({
  imports: [
    LoggingModule,
    ConfigModule,
    ScheduleModule.forRoot(),
    HealthModule,
    JobsModule,
  ],
})
export class AppModule {}
