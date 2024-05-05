# generate build and running 

FROM oven/bun:alpine as build
WORKDIR /app
COPY . .
RUN bun install
RUN bunx prisma generate
RUN bun run build
EXPOSE 3001
CMD [ "bun","run","start:prod" ]