# =============================================
# DORAMAFLIX BACKEND - DOCKERFILE
# Multi-stage build for optimized production image
# =============================================

# Stage 1: Build stage
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    libc6-compat

# Copy package files
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Stage 2: Production stage
FROM node:20-alpine AS production

# Set NODE_ENV to production
ENV NODE_ENV=production

# Create app directory and user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S doramaflix -u 1001

# Set working directory
WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    dumb-init \
    curl \
    ffmpeg

# Copy built application from builder stage
COPY --from=builder --chown=doramaflix:nodejs /app/dist ./dist
COPY --from=builder --chown=doramaflix:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=doramaflix:nodejs /app/prisma ./prisma
COPY --from=builder --chown=doramaflix:nodejs /app/package.json ./package.json

# Create necessary directories
RUN mkdir -p logs uploads temp && \
    chown -R doramaflix:nodejs logs uploads temp

# Switch to non-root user
USER doramaflix

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start the application
CMD ["node", "dist/index.js"]