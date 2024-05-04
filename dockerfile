# generate build and running 

FROM oven/bun:alpine as build
WORKDIR /app
COPY . .
RUN bun install
RUN bunx prisma generate
RUN bun build:compile

FROM alpine:latest
WORKDIR /app
COPY --from=build /app/bin/honobackend .
EXPOSE 3001
CMD ["./honobackend"]