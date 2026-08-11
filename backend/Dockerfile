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
COPY scripts ./scripts
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

# dist/db already contains schema.sql, seed.sql and migrations/, copied by the build.
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 5000

CMD ["sh", "-c", "node dist/db/deploy.js && node dist/server.js"]
