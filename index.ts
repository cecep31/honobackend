import { app } from './src/server/app';
import { shutdownMiddlewares } from './src/middlewares';

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
  
  // Cleanup rate limiter store to prevent memory leak
  shutdownMiddlewares();
  
  console.log('Server shutdown complete.');
  process.exit(0);
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

