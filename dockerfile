# generate build and running 

FROM oven/bun:alpine as build
WORKDIR /app
COPY . .
RUN bun upgrade
RUN bun install
EXPOSE 3001
CMD [ "bun","run","start" ]