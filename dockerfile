# generate build and running 

FROM oven/bun:alpine as build
WORKDIR /app
COPY . .
RUN bun install
RUN bun run build:compile

FROM oven/bun:alpine as run
WORKDIR /app
COPY --from=build /app/bin/ ./bin
EXPOSE 3001
CMD [ "./bin/honobackend" ]
# CMD [ "bun","run","start" ]