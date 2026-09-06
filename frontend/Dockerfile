# --- Stage 1: Build ---
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package for monorepo references if needed
COPY package*.json ./

RUN npm ci

COPY . .

# Build Next.js application
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

RUN npm run build

# --- Stage 2: Production Runner ---
FROM node:20-alpine AS runner

WORKDIR /app

RUN apk add --no-cache dumb-init

ENV NODE_ENV=production
ENV PORT=4444
ENV NEXT_TELEMETRY_DISABLED=1

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public

USER nextjs

EXPOSE 4444

ENTRYPOINT ["dumb-init", "--"]

CMD ["npm", "run", "start"]
