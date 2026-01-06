# Hono Backend Project - Development Context

## Project Overview

This is a full-stack web backend application built with TypeScript and the Bun runtime. The project uses the Hono framework to create a RESTful API with PostgreSQL as the database backend, utilizing Drizzle ORM for database operations. The application provides features for user management, content management, authentication, chat functionality, and investment holdings tracking.

## Architecture & Technologies

- **Runtime**: Bun (JavaScript/TypeScript runtime)
- **Framework**: Hono (web framework for building APIs)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT-based authentication with refresh tokens
- **Validation**: Zod for request validation
- **Rate Limiting**: Hono-rate-limiter
- **Containerization**: Docker and Docker Compose
- **Deployment**: Fly.io (based on fly.toml)

## Project Structure

The project follows a modular architecture with the following key directories:

- `src/config/` - Application configuration and environment variables
- `src/database/` - Database schema definitions and connection setup
- `src/middlewares/` - Hono middleware functions (auth, logging, CORS, etc.)
- `src/modules/` - API modules containing controllers, services, and validation
- `src/pkg/` - Business logic services
- `src/router/` - API route definitions
- `src/server/` - Server initialization and configuration
- `src/types/` - TypeScript type definitions
- `src/utils/` - Utility functions

## Key Features

- RESTful API with versioning (v1)
- User management (CRUD operations)
- Authentication system (OAuth with GitHub)
- Posts and content management
- Chat functionality
- Holdings tracking (investment/portfolio management)
- Tagging system
- Like and bookmark functionality
- File management
- Rate limiting
- Logging and error handling
- CORS support
- Request ID tracking

## Database Schema

The application uses PostgreSQL with the following main entities:
- Users (with profiles, sessions, and follow relationships)
- Posts (with comments, likes, bookmarks, and views)
- Tags (with posts-to-tags relationships)
- Chat conversations and messages
- Holdings (investment tracking)
- Post views, likes, and bookmarks

## Environment Variables

The application requires the following environment variables (refer to `.env.example` for a complete list):
- `DATABASE_URL` - PostgreSQL database connection string
- `JWT_SECRET` - Secret for JWT token generation
- `PORT` - Server port (default: 3001)
- Various other configuration variables for external services (GitHub OAuth, S3, OpenRouter, etc.)

## Building and Running Instructions

### Prerequisites
- Node.js with Bun runtime installed
- PostgreSQL database
- Bun package manager

### Setup
1. Install dependencies: `bun install`
2. Set up environment variables (copy from `.env.example`)
3. Configure your PostgreSQL database connection in the `DATABASE_URL` environment variable

### Development
- Run in development mode: `bun run dev`
- The server will start on port 3001 by default
- Access the application at: http://localhost:3001

### Building
- Build the project: `bun run build`
- This compiles TypeScript and bundles the application

### Database Management
- Generate database schema: `bun run db:generate`
- Migrate database: `bun run db:migrate`
- Pull database schema: `bun run db:pull`
- Push schema to database: `bun run db:push`
- Open Drizzle Studio: `bun run studio`

### Testing
- Run tests: `bun test`

### Production
- Start production build: `bun run start:prod`

### Docker
- The project includes a `docker-compose.yml` for containerized deployment
- Builds a Docker image with the application and runs it with PostgreSQL

## Development Conventions

- API routes are versioned under `/v1`
- Controllers are organized within each module in the `src/modules/` directory
- Controllers follow a consistent pattern with proper error handling
- Request validation is done using Zod schemas
- Authentication is handled via middleware
- Services are organized in the `pkg` directory with clear separation of concerns
- TypeScript is used throughout the project for type safety
- Proper error handling with consistent response format
- Logging includes request IDs for traceability

## API Endpoints

The application provides the following main API routes:
- `/v1/auth` - Authentication endpoints
- `/v1/users` - User management
- `/v1/posts` - Post management
- `/v1/tags` - Tag management
- `/v1/likes` - Like functionality
- `/v1/writers` - Writer-specific functionality
- `/v1/chat` - Chat functionality
- `/v1/holdings` - Investment holdings tracking
- `/v1/bookmarks` - Bookmark functionality

## Error Handling

The application implements a centralized error handling mechanism that:
- Catches unhandled exceptions and rejections
- Provides consistent error response format
- Includes request IDs for debugging
- Logs errors appropriately

## Security Features

- Rate limiting to prevent abuse
- CORS configuration with specific allowed origins
- JWT-based authentication
- Input validation using Zod
- Proper handling of sensitive data in environment variables