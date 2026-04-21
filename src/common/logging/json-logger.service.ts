import { Injectable, LoggerService } from '@nestjs/common';
import { AppConfigService } from '../../config/app-config.service';

type LogLevel = 'log' | 'error' | 'warn' | 'debug' | 'verbose' | 'fatal';
type LogRecord = {
  context?: string;
  data?: unknown;
  error?: Record<string, unknown>;
  level: LogLevel;
  message: string;
  timestamp: string;
  trace?: string;
};

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const COLORS = {
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  green: '\x1b[32m',
  magenta: '\x1b[35m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
};

@Injectable()
export class JsonLogger implements LoggerService {
  constructor(private readonly config?: AppConfigService) {}

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
    const record = this.buildRecord(level, message, context, trace);
    const line =
      this.config?.logFormat === 'json'
        ? this.formatJson(record)
        : this.formatPretty(record);

    if (level === 'error' || level === 'fatal' || level === 'warn') {
      console.error(line);
      return;
    }

    console.log(line);
  }

  private buildRecord(
    level: LogLevel,
    message: unknown,
    context?: string,
    trace?: string,
  ): LogRecord {
    const record: LogRecord = {
      level,
      message: 'structured_log',
      timestamp: new Date().toISOString(),
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

    return record;
  }

  private formatJson(record: LogRecord): string {
    return JSON.stringify(record, (_key, value) => {
      if (value instanceof Error) {
        return this.serializeError(value);
      }

      return value;
    });
  }

  private formatPretty(record: LogRecord): string {
    const colorEnabled = this.config?.logColors ?? true;
    const timestamp = this.color(record.timestamp, COLORS.gray, colorEnabled);
    const level = this.formatLevel(record.level, colorEnabled);
    const context = record.context
      ? this.color(`[${record.context}]`, COLORS.cyan, colorEnabled)
      : '';
    const event = this.extractEvent(record.data);
    const message =
      event ?? record.message === 'structured_log'
        ? (event ?? record.message)
        : record.message;
    const fields = this.formatData(record.data, event);
    const trace = record.trace
      ? `\n${this.color(record.trace, COLORS.gray, colorEnabled)}`
      : '';

    return [timestamp, level, context, message, fields]
      .filter(Boolean)
      .join(' ')
      .concat(trace);
  }

  private formatLevel(level: LogLevel, colorEnabled: boolean): string {
    const labels: Record<LogLevel, string> = {
      debug: 'DEBUG',
      error: 'ERROR',
      fatal: 'FATAL',
      log: 'INFO ',
      verbose: 'TRACE',
      warn: 'WARN ',
    };
    const colors: Record<LogLevel, string> = {
      debug: COLORS.magenta,
      error: COLORS.red,
      fatal: COLORS.red,
      log: COLORS.green,
      verbose: COLORS.gray,
      warn: COLORS.yellow,
    };

    return this.color(labels[level], colors[level], colorEnabled);
  }

  private formatData(data: unknown, event?: string): string {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return '';
    }

    const entries = Object.entries(data as Record<string, unknown>)
      .filter(([key]) => key !== 'event')
      .map(([key, value]) => `${key}=${this.formatValue(value)}`);

    if (entries.length === 0) {
      return '';
    }

    const fields = entries.join(' ');
    const colorEnabled = this.config?.logColors ?? true;

    return this.color(fields, DIM, colorEnabled);
  }

  private formatValue(value: unknown): string {
    if (value instanceof Error) {
      return JSON.stringify(this.serializeError(value));
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (typeof value === 'string') {
      return value.includes(' ') ? JSON.stringify(value) : value;
    }

    if (
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null ||
      value === undefined
    ) {
      return String(value);
    }

    return JSON.stringify(value);
  }

  private extractEvent(data: unknown): string | undefined {
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return undefined;
    }

    const event = (data as Record<string, unknown>).event;

    return typeof event === 'string' ? event : undefined;
  }

  private color(value: string, color: string, enabled: boolean): string {
    if (!enabled) {
      return value;
    }

    return `${color}${value}${RESET}`;
  }

  private serializeError(error: Error): Record<string, unknown> {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  }
}
