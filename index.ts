import { app } from './src/server/app';
import { getLogger } from './src/middlewares/logger';

// Setup application
const logger = getLogger();
logger.log({
  level: 'info',
  message: 'Starting application...',
  timestamp: new Date().toISOString(),
  context: {
    phase: 'application_startup',
    environment: process.env.NODE_ENV || 'development'
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Consider implementing proper error reporting here
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider implementing proper error reporting here
});

// Graceful shutdown handler
const shutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down server gracefully...`);
  
  // Add any cleanup tasks here
  // For now, we just give a small delay for any pending logs or requests
  setTimeout(() => {
    console.log('Server shutdown complete.');
    process.exit(0);
  }, 500);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Server configuration
export default {
  port: process.env['PORT'] || 3001,
  fetch: app.fetch,
  // Increase timeout values
  requestTimeout: 30, // seconds
  idleTimeout: 60, // seconds
  // Enable keep-alive
  keepAliveTimeout: 120, // seconds
  // Maximum number of requests per socket
  maxRequestsPerSocket: 100,
};

