# generate build and running 

FROM oven/bun:alpine
WORKDIR /app
COPY . .
RUN bun install
EXPOSE 3001
CMD ["bun", "run", "start"]