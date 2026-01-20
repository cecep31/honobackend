# AGENTS.md

This file provides guidance to agentic coding tools when working with this Hono/TypeScript backend codebase.

## Build/Lint/Test Commands
- `bun run typecheck` - Run TypeScript type checking
- `bun run format` - Format code with Prettier
- `bun test` - Run all tests
- `bun test <file>` - Run single test file (e.g., `bun test src/test/authservice.test.ts`)
- `bun test --watch` - Run tests in watch mode
- `bun test --coverage` - Run tests with coverage report
- `bun run build` - Build production version to dist/
- `bun run build:compile` - Compile to standalone binary
- `bun run dev` - Start development server with hot reload
- `bun run start` - Start server using bun run
- `bun run start:prod` - Start production server from dist/
- `bun run db:generate` - Generate Drizzle migrations
- `bun run db:migrate` - Run database migrations
- `bun run db:push` - Push schema changes to database
- `bun run db:pull` - Pull schema from database
- `bun run db:studio` - Open Drizzle Studio
- `bun run clean` - Remove build artifacts

## Code Style Guidelines

### Imports
- Use ES modules (`import/export` syntax)
- Group imports by source (framework, local, types): framework first, then local modules, then types
- Avoid wildcard imports

### Formatting
- 2-space indentation
- Single quotes for strings
- Semicolons at end of statements
- Maximum line length: 100 characters
- Consistent spacing around operators and after commas
- Use `bun run format` to format code with Prettier (configured in .prettierrc)

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

### Error Codes Classification
- Use structured error codes with prefixes:
  - `1xxx`: Authentication/Authorization errors
  - `2xxx`: Validation errors
  - `3xxx`: Database errors
  - `4xxx`: External service errors
  - `5xxx`: Business logic errors
  - `6xxx`: System/Infrastructure errors
- Example: `AUTH_001`, `DB_001`, `VALID_001`

### Error Handling
- Use try/catch blocks for async operations
- Return consistent error response format with `requestId`
- Use the `Errors` utility class for common error types
- Include appropriate HTTP status codes
- Log errors in development, avoid exposing sensitive information in production

### JWT Tokens
- JWT payload should include: `user_id`, `email`, `is_super_admin`, `exp`
- Set expiration to 5 hours (5 * 60 * 60 seconds)
- Use `hono/jwt` for token operations

### Development Helpers
- Use conditional spreads for development-only data: `...(process.env.NODE_ENV === "development" && { token, resetLink })`
- This pattern keeps production responses clean while providing debug info in development

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

### Zod Validation
- Use `@hono/zod-validator` for request validation
- Define schemas in separate files for reusability
- Include descriptive error messages
- Validate both body and query parameters
- Share common validation patterns across routes

### Drizzle Validation
- Use `drizzle-orm` validation helpers for database-level validation
- Validate data before inserting/updating records
- Use `inferSelectSchema` and `inferInsertSchema` for type safety
- Handle validation errors consistently with application errors

### Hono Framework Patterns
- Register routes on the app instance using `.get()`, `.post()`, etc.
- Use `c.var()` for request-scoped variables
- Apply middleware with `.use()` for cross-cutting concerns
- Return `c.json()` for JSON responses
- Access request data via `c.req.parseBody()`, `c.req.query()`, etc.
