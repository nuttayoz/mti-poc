import { Injectable, LoggerService } from '@nestjs/common';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';

@Injectable()
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('log', message, context);
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('fatal', message, context);
  }

  private write(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const record: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      level,
    };

    if (context) {
      record.context = context;
    }

    if (typeof message === 'string') {
      record.message = message;
    } else if (message instanceof Error) {
      record.message = message.message;
      record.error = this.serializeError(message);
    } else {
      record.message = 'structured_log';
      record.data = message;
    }

    if (trace) {
      record.trace = trace;
    }

    const line = JSON.stringify(record, (_key, value) => {
      if (value instanceof Error) {
        return this.serializeError(value);
      }

      return value;
    });

    if (level === 'error' || level === 'fatal' || level === 'warn') {
      console.error(line);
      return;
    }

    console.log(line);
  }

  private serializeError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}
