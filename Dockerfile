# Multi-stage build: API + static frontend served from one container
# Optimized for Vultr free tier (1 vCPU, 512MB RAM, 10GB SSD)

# Stage 1: Build frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/web
COPY coheron-works-web/package*.json ./
RUN npm ci --production=false
COPY coheron-works-web/ ./
RUN npm run build

# Stage 2: Build API
FROM node:20-alpine AS api-build
WORKDIR /app/api
COPY coheron-works-api/package*.json ./
RUN npm ci --production=false
COPY coheron-works-api/ ./
RUN NODE_OPTIONS="--max-old-space-size=1024" npm run build

# Stage 3: Production image
FROM node:20-alpine AS production
WORKDIR /app

# Install only production deps for API
COPY coheron-works-api/package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built API
COPY --from=api-build /app/api/dist ./dist

# Copy built frontend into public/ — served by Express
COPY --from=frontend-build /app/web/dist ./public

# Non-root user for security
RUN addgroup -g 1001 -S appgroup && \
    adduser -S appuser -u 1001 -G appgroup
USER appuser

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Limit Node.js heap to 320MB (leaves room for Redis + OS overhead on 512MB VPS)
CMD ["node", "--max-old-space-size=320", "dist/server.js"]
