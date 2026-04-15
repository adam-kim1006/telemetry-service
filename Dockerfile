FROM node:20-alpine

WORKDIR /app

COPY package.json tsconfig.json ./
RUN pnpm install

COPY src ./src
COPY migrations ./migrations

RUN pnpm run build

EXPOSE 3000

CMD ["pnpm", "start"]
