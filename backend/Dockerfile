# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies (including devDependencies for build)
RUN npm ci

# Generate Prisma Client
RUN npx prisma generate

# Copy source code
COPY . .

# Build NestJS application
RUN npm run build

# Prune dev dependencies for production
RUN npm prune --production

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl dumb-init

ENV NODE_ENV=production
ENV PORT=3333

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Copy build artifacts & dependencies from builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

USER nestjs

EXPOSE 3333

# Use dumb-init to handle PID 1 signal forwarding
ENTRYPOINT ["dumb-init", "--"]

CMD ["node", "dist/main.js"]
