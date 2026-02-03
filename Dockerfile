# CommonWell Document Query Tool - Docker Image for GCP Deployment
# Multi-stage build for optimized production image

# Stage 1: Build the application
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY . .

# Build the application (outputs to dist/index.cjs with bundled deps)
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for health checks
RUN apk add --no-cache curl

# Copy package files (needed for any unbundled native modules)
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Copy config file
COPY --from=builder /app/server/config.ts ./server/config.ts

# Copy certs directory (certificates should be placed here before build or mounted at runtime)
COPY certs/ ./certs/

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Default certificate paths (override via Kubernetes ConfigMap/environment)
ENV CLIENT_CERT_PATH=/app/certs/client-cert.pem
ENV CLIENT_KEY_PATH=/app/certs/client-key.pem

# Expose port for GKE container
EXPOSE 8080

# Health check for container orchestration
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:8080/api/query-history || exit 1

# Start the application (dist/index.cjs is the bundled server output)
CMD ["node", "dist/index.cjs"]
