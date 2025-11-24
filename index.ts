import { app } from './src/server/app';
import setupRouter from './src/router';
import { setupMiddlewares } from './src/middlewares';

// Setup application
setupMiddlewares();
setupRouter();

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
const shutdown = async () => {
  console.log('Shutting down server...');
  // Add any cleanup tasks here
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

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

