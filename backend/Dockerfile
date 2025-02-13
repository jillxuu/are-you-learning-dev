# Build stage
FROM node:20-alpine AS builder
RUN apk update
RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy package files and TypeScript config
COPY package*.json tsconfig.json ./

# Install all dependencies for build
RUN npm install

# Create src directory and copy source code
COPY src ./src

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

# Add libc compatibility for Alpine and required packages
RUN apk add --no-cache libc6-compat curl tini

# Create app directory and user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nodejs && \
    mkdir -p /app/uploads/workshop-images && \
    chown -R nodejs:nodejs /app

WORKDIR /app

# Copy package files
COPY --chown=nodejs:nodejs package*.json ./

# Install dependencies with a two-step process to ensure all required deps are included
RUN npm install --production=false && \
    npm prune --production

# Copy built files from builder stage
COPY --chown=nodejs:nodejs --from=builder /app/build ./build

# Use non-root user
USER nodejs

# Set production environment
ENV NODE_ENV=production
ENV PORT=8080

# Use tini as init system
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "build/server.js"]
