# Stage 1: Build
FROM oven/bun:1-alpine AS builder
WORKDIR /app

# Install dependencies based on lockfile (improved caching)
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Compile the application to a binary
RUN bun run build:compile

# Stage 2: Production Runner
# We use alpine for a lightweight final image, but ensure it has necessary libs if needed.
# Since we compiled with --target bun on alpine base, it should work.
# Using oven/bun:1-alpine again to be safe with shared libs matches previous known-good state.
FROM oven/bun:1-alpine AS runner

WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy the compiled binary from the builder stage
COPY --from=builder /app/bin/honobackend .

# Expose the application port
EXPOSE 3001

# Run the application
CMD ["./honobackend"]
