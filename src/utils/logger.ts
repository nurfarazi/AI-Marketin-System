import type { NextFunction, Request, Response } from 'express';
import { readTrimmedEnv } from '../config/env';

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

const levelEmoji: Record<LogLevel, string> = {
  error: '❌',
  warn: '⚠️',
  info: 'ℹ️',
  debug: '🐞',
};

const levelOrder: Record<LogLevel, number> = {
  error: 0,
  warn: 1,
  info: 2,
  debug: 3,
};

function resolveLevel(value: string | undefined): LogLevel {
  const normalized = value.toLowerCase();
  if (normalized === 'error' || normalized === 'warn' || normalized === 'info' || normalized === 'debug') {
    return normalized;
  }

  throw new Error('LOG_LEVEL must be one of: error, warn, info, debug.');
}

function formatMeta(meta: unknown) {
  if (meta === undefined) return '';
  if (meta instanceof Error) {
    return ` ${meta.name}: ${meta.message}`;
  }

  try {
    return ` ${JSON.stringify(meta)}`;
  } catch {
    return ` ${String(meta)}`;
  }
}

const configuredLevel = resolveLevel(readTrimmedEnv('LOG_LEVEL'));

function write(level: LogLevel, scope: string | undefined, message: string, meta?: unknown) {
  if (levelOrder[level] > levelOrder[configuredLevel]) {
    return;
  }

  const timestamp = new Date().toISOString();
  const scopePrefix = scope ? ` [${scope}]` : '';
  const output = `[${timestamp}] ${levelEmoji[level]} [${level.toUpperCase()}]${scopePrefix} ${message}${formatMeta(meta)}`;

  if (level === 'error') {
    console.error(output);
    return;
  }

  if (level === 'warn') {
    console.warn(output);
    return;
  }

  console.log(output);
}

export function createLogger(scope?: string) {
  return {
    error(message: string, meta?: unknown) {
      write('error', scope, message, meta);
    },
    warn(message: string, meta?: unknown) {
      write('warn', scope, message, meta);
    },
    info(message: string, meta?: unknown) {
      write('info', scope, message, meta);
    },
    debug(message: string, meta?: unknown) {
      write('debug', scope, message, meta);
    },
  };
}

export const logger = createLogger('app');

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = process.hrtime.bigint();

  res.on('finish', () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
    logger.info(`${req.method} ${req.originalUrl}`, {
      statusCode: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
    });
  });

  next();
}
