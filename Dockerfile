FROM oven/bun:1-alpine AS build
WORKDIR /app

# Install deps first for better Docker layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

# Build single executable binary
COPY . .
RUN bun run build:compile

FROM oven/bun:1-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
USER bun

COPY --from=build /app/bin/honobackend /app/honobackend

EXPOSE 3001
CMD ["/app/honobackend"]
