# Build stage for React frontend
FROM node:20-alpine AS client-build

WORKDIR /app/client

# Copy client package files
COPY client/package*.json ./

# Install client dependencies
RUN npm ci

# Copy client source
COPY client/ ./

# Build client (skip type checking for faster builds)
RUN npm run build -- --skipLibCheck

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy server package files
COPY package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy server source
COPY server/ ./server/

# Copy built client from build stage
COPY --from=client-build /app/client/dist ./client/dist

# Copy environment example
COPY .env.example ./

# Expose port
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start server
CMD ["node", "server/index.js"]

