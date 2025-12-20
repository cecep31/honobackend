# AGENTS.md

This file provides guidance to agentic coding tools when working with this Hono/TypeScript backend codebase.

## Build/Lint/Test Commands
- `bun run typecheck` - Run TypeScript type checking
- `bun test` - Run all tests
- `bun test <file>` - Run single test file (e.g., `bun test src/test/authservice.test.ts`)
- `bun run build` - Build production version
- `bun run dev` - Start development server

## Code Style Guidelines
- **Imports**: Use ES modules (`import/export` syntax)
- **Formatting**: Follow TypeScript ESLint standards, 2-space indentation
- **Types**: Use TypeScript interfaces for complex types, Zod schemas for validation
- **Naming**: camelCase for variables/functions, PascalCase for types/classes
- **Error Handling**: Use try/catch blocks, return consistent error response format with `requestId`
- **Testing**: Use Bun's test runner with mocking, follow existing test patterns
- **Database**: Use Drizzle ORM for PostgreSQL operations
- **API**: Follow RESTful conventions, use Hono framework patterns