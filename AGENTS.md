# AGENTS.md

This file provides guidance to agentic coding tools when working with this Hono/TypeScript backend codebase.

## Build/Lint/Test Commands
- `bun run typecheck` - Run TypeScript type checking
- `bun test` - Run all tests
- `bun test <file>` - Run single test file (e.g., `bun test src/test/authservice.test.ts`)
- `bun run build` - Build production version
- `bun run dev` - Start development server

## Code Style Guidelines

### Imports
- Use ES modules (`import/export` syntax)
- Group imports by source (framework, local, types)
- Avoid wildcard imports

### Formatting
- 2-space indentation
- Single quotes for strings
- Semicolons at end of statements
- Maximum line length: 100 characters
- Consistent spacing around operators and after commas

### Types
- Use TypeScript interfaces for complex types
- Use Zod schemas for request validation
- Prefer type inference where possible
- Use PascalCase for types and interfaces
- Use `type` for simple type aliases, `interface` for complex object shapes

### Naming Conventions
- **Variables/Functions**: camelCase (e.g., `userService`, `getUserById`)
- **Types/Classes**: PascalCase (e.g., `UserService`, `AuthController`)
- **Constants**: UPPER_CASE (e.g., `JWT_SECRET`, `MAX_RETRIES`)
- **Boolean variables**: Prefix with `is`, `has`, `can` (e.g., `isActive`, `hasPermission`)
- **Private class members**: Prefix with underscore (e.g., `_userService`)

### Error Handling
- Use try/catch blocks for async operations
- Return consistent error response format with `requestId`
- Use the `Errors` utility class for common error types
- Include appropriate HTTP status codes
- Log errors in development, avoid exposing sensitive information in production

### Testing
- Use Bun's test runner with mocking
- Follow existing test patterns with `describe`, `it`, `beforeEach`
- Mock external dependencies and database calls
- Test both success and error cases
- Use `mock.module()` for module-level mocking
- Test edge cases and validation scenarios

### Database
- Use Drizzle ORM for PostgreSQL operations
- Follow repository pattern for data access
- Use prepared statements to prevent SQL injection
- Handle database errors gracefully
- Use transactions for multi-operation workflows

### API Design
- Follow RESTful conventions
- Use Hono framework patterns
- Consistent endpoint naming (kebab-case)
- Version APIs when breaking changes occur
- Use proper HTTP methods (GET, POST, PUT, PATCH, DELETE)
- Include appropriate response codes

### Security
- Validate all user input
- Sanitize database queries
- Use JWT for authentication
- Implement rate limiting for public endpoints
- Store secrets in environment variables
- Never log sensitive information

### Documentation
- Use JSDoc comments for public APIs
- Document complex business logic
- Keep README updated with setup and usage instructions
- Document database schema changes

### Git Practices
- Use feature branches for new development
- Write meaningful commit messages
- Include issue references when applicable
- Keep commits small and focused
- Rebase before merging to main branch

### Code Organization
- Group related files in modules
- Separate controllers, services, and repositories
- Use `src/modules/` for feature organization
- Keep utility functions in `src/utils/`
- Store types in `src/types/`
- Place tests in `src/test/` with `.test.ts` suffix

### Performance
- Use Bun's optimized functions where possible
- Implement caching for expensive operations
- Use database indexes appropriately
- Avoid N+1 query problems
- Optimize image and file uploads

### Logging
- Use structured logging format
- Include request IDs for tracing
- Log at appropriate levels (debug, info, warn, error)
- Avoid logging sensitive data
- Include timestamps in log entries

### Environment Configuration
- Use `.env` files for environment variables
- Provide `.env.example` with placeholder values
- Validate environment variables on startup
- Use different configurations for development, testing, production

### Dependency Management
- Keep dependencies updated
- Use exact versions in package.json
- Document why each dependency is needed
- Prefer smaller, focused libraries
- Avoid adding unnecessary dependencies