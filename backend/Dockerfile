FROM node:20-bookworm-slim AS deps

WORKDIR /app
ENV NODE_ENV=development

COPY package*.json ./
RUN npm ci

FROM node:20-bookworm-slim AS builder

WORKDIR /app
ENV NODE_ENV=development

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends postgresql-client \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY src/db ./src/db

USER node
EXPOSE 5000

CMD ["sh", "-c", "npm run db:schema && node dist/db/migrate.js && node dist/server.js"]
