# generate build and running 
FROM oven/bun:alpine as build
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build

# FROM alpine:latest as run
FROM oven/bun:alpine as run
WORKDIR /app
COPY --from=build /app/dist/index.js .
EXPOSE 3001
CMD [ "bun","index.js" ]
# CMD [ "bun","run","start" ]