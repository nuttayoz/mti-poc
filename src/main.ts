import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { JsonLogger } from './common/logging/json-logger.service';
import { AppConfigService } from './config/app-config.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(JsonLogger);
  app.useLogger(logger);
  app.enableShutdownHooks();

  const config = app.get(AppConfigService);

  await app.listen(config.port, config.host);

  logger.log(
    {
      event: 'app.started',
      host: config.host,
      port: config.port,
      service: 'smart-document-gateway',
    },
    'Bootstrap',
  );
}

bootstrap().catch((error: unknown) => {
  const logger = new JsonLogger();

  logger.error(
    {
      event: 'app.bootstrap_failed',
      error,
    },
    undefined,
    'Bootstrap',
  );

  process.exit(1);
});
