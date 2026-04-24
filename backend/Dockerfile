# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Install production dependencies
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS deps

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force


# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Build TypeScript
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src

RUN npm run build


# ─────────────────────────────────────────────────────────────────────────────
# Stage 3: Production runner (non-root, minimal image)
# ─────────────────────────────────────────────────────────────────────────────
FROM node:22-alpine AS runner

# Create a non-root system user for security
RUN addgroup --system --gid 1001 elecshop && \
    adduser  --system --uid 1001 --ingroup elecshop elecshop

WORKDIR /app

# Copy production node_modules from deps stage
COPY --from=deps    --chown=elecshop:elecshop /app/node_modules ./node_modules

# Copy compiled application from builder stage
COPY --from=builder --chown=elecshop:elecshop /app/dist ./dist

# Copy SQL files needed at runtime (schema init, seed)
COPY --chown=elecshop:elecshop src/db ./src/db

USER elecshop

EXPOSE 5000

# Healthcheck — Docker will restart the container if this fails
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "dist/server.js"]
