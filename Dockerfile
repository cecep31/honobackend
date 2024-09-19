# generate build and running 
FROM oven/bun:1-alpine AS build
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build:compile

# FROM alpine:latest as run
FROM oven/bun:1-alpine AS run
WORKDIR /app
COPY --from=build /app/bin/honobackend .
EXPOSE 3001
CMD ["./honobackend"]