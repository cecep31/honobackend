import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Hono } from 'hono';
import { logger, getLogger, setLogLevel, loggingMiddleware } from '../middlewares/logger';

describe('Logger', () => {
  beforeEach(() => {
    setLogLevel('debug');
  });

  it('logs at error level', () => {
    const consoleError = mock(() => {});
    const original = console.error;
    console.error = consoleError;
    logger.error('Something broke', { method: 'GET' }, new Error('Detail'));
    expect(consoleError).toHaveBeenCalled();
    console.error = original;
  });

  it('logs at warn level', () => {
    const consoleWarn = mock(() => {});
    const original = console.warn;
    console.warn = consoleWarn;
    logger.warn('Warning message', { method: 'GET' });
    expect(consoleWarn).toHaveBeenCalled();
    console.warn = original;
  });

  it('logs at info level', () => {
    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;
    logger.info('Info message', { method: 'GET' });
    expect(consoleLog).toHaveBeenCalled();
    console.log = original;
  });

  it('logs at http level', () => {
    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;
    logger.http('HTTP message', { method: 'GET' });
    expect(consoleLog).toHaveBeenCalled();
    console.log = original;
  });

  it('logs at debug level', () => {
    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;
    logger.debug('Debug message', { method: 'GET' });
    expect(consoleLog).toHaveBeenCalled();
    console.log = original;
  });

  it('does not log below current level', () => {
    setLogLevel('error');
    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;
    logger.info('Info message');
    expect(consoleLog).not.toHaveBeenCalled();
    console.log = original;
  });

  it('creates contextual logger with withContext', () => {
    const contextual = logger.withContext({ userId: 'test' });
    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;
    contextual.info('Test');
    expect(consoleLog).toHaveBeenCalled();
    console.log = original;
  });

  it('getLogger returns contextual logger when context provided', () => {
    const contextual = getLogger({ method: 'GET' });
    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;
    contextual.info('Test');
    expect(consoleLog).toHaveBeenCalled();
    console.log = original;
  });

  it('getLogger returns default logger when no context', () => {
    const defaultLogger = getLogger();
    expect(defaultLogger).toBe(logger);
  });
});

describe('loggingMiddleware', () => {
  it('logs request completion with status code', async () => {
    const app = new Hono();
    app.use(loggingMiddleware);
    app.get('/test', (c) => c.text('OK'));

    const consoleLog = mock(() => {});
    const original = console.log;
    console.log = consoleLog;

    await app.request('/test');

    expect(consoleLog).toHaveBeenCalled();
    console.log = original;
  });

  it('logs error when next throws', async () => {
    const app = new Hono();
    app.use(loggingMiddleware);
    app.get('/error', () => {
      throw new Error('Boom');
    });

    const consoleError = mock(() => {});
    const original = console.error;
    console.error = consoleError;

    const res = await app.request('/error');
    expect(res.status).toBe(500);
    expect(consoleError).toHaveBeenCalled();
    console.error = original;
  });

  it('uses warn level for 4xx responses', async () => {
    const app = new Hono();
    app.use(loggingMiddleware);
    app.get('/not-found', (c) => c.json({ error: 'Not found' }, 404));

    const consoleWarn = mock(() => {});
    const originalWarn = console.warn;
    console.warn = consoleWarn;

    await app.request('/not-found');

    expect(consoleWarn).toHaveBeenCalled();
    console.warn = originalWarn;
  });

  it('uses error level for 5xx responses', async () => {
    const app = new Hono();
    app.use(loggingMiddleware);
    app.get('/server-error', (c) => c.json({ error: 'Oops' }, 500));

    const consoleError = mock(() => {});
    const originalError = console.error;
    console.error = consoleError;

    await app.request('/server-error');

    expect(consoleError).toHaveBeenCalled();
    console.error = originalError;
  });
});
