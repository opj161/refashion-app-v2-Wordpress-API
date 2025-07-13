# Use an official Node.js runtime as a parent image
FROM node:20-alpine AS base

# 1. ---- Dependencies Stage ----
# Only re-run when package.json or package-lock.json changes
FROM base AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json* ./
RUN npm ci

# 2. ---- Production Dependencies Stage ----
# Create a separate stage for production-only node_modules
FROM base AS prod-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --only=production && npm cache clean --force

# 3. ---- Builder Stage ----
# This stage builds the Next.js application
FROM base AS builder
WORKDIR /app

# Accept build-time arguments for Next.js public environment variables
ARG NEXT_PUBLIC_FAL_KEY
ENV NEXT_PUBLIC_FAL_KEY=$NEXT_PUBLIC_FAL_KEY

# Accept build-time argument for ENCRYPTION_SECRET
ARG ENCRYPTION_SECRET
ENV ENCRYPTION_SECRET=$ENCRYPTION_SECRET

# Copy dependencies from the 'deps' stage
COPY --from=deps /app/node_modules ./node_modules
# Copy package.json for npm scripts
COPY package.json ./
# Copy configuration files
COPY next.config.ts postcss.config.* tailwind.config.ts tsconfig.json tsconfig.scripts.json ./
COPY components.json ./
# Copy the source code
COPY src ./src
COPY public ./public
COPY scripts ./scripts

# Set NEXT_TELEMETRY_DISABLED before build
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# 4. ---- Runner Stage (Final Image) ----
# This stage creates the final, lean production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN apk add --no-cache su-exec

# Copy production dependencies from the 'prod-deps' stage
COPY --from=prod-deps /app/node_modules ./node_modules

# Copy the built application from the 'builder' stage
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static/

# Copy package.json to be able to run npm scripts
COPY --from=builder /app/package.json ./package.json
# Copy the compiled migration scripts and its dependencies
COPY --from=builder /app/dist/scripts ./dist/scripts
COPY --from=builder /app/dist/src ./dist/src

# Create directories for volumes. Ownership will be set by entrypoint.sh
RUN mkdir -p /app/user_data/history && \
    mkdir -p /app/public/uploads/user_uploaded_clothing && \
    mkdir -p /app/public/uploads/generated_images && \
    mkdir -p /app/public/uploads/generated_videos && \
    chmod -R 755 /app/user_data /app/public/uploads

# Copy and set up the entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh && \
    sed -i 's/\r$//' /entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]