# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies (cached layer)
COPY package*.json ./
RUN npm ci

# Copy source
COPY . .

# Build args for environment variables
ARG VITE_API_URL
# TODO: Add your build args here

# Create .env file for build
RUN echo "VITE_API_URL=${VITE_API_URL}" > .env

# Build application
RUN npm run build

# Stage 2: Production (Nginx)
FROM nginx:alpine

# Install curl for health checks
RUN apk add --no-cache curl

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy build from stage 1
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
