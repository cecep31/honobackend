# generate build and running 

FROM oven/bun:alpine
WORKDIR /app
COPY . .
RUN npm install
CMD ["bun", "run", "start"]