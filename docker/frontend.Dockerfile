# ─────────────────────────────────────────────────────────────────────────────
# docker/frontend.Dockerfile
#
# Multi-stage build:
#   Stage 1 (builder)  – Node 20 Alpine installs deps and runs `vite build`
#   Stage 2 (runtime)  – nginx Alpine serves the compiled static files and
#                         reverse-proxies /api/* to the backend container
#
# The final image is tiny (~25 MB) because Node tooling is discarded.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /build

# Copy package files first for better layer caching.
# If only source code changes, npm ci is skipped on rebuild.
COPY frontend/package.json frontend/package-lock.json ./

RUN npm ci --prefer-offline

# Copy all frontend source files
COPY frontend/ .

# Build production bundle.
# All API calls use the relative path /api (no hard-coded localhost),
# so the built output works correctly behind nginx's reverse proxy.
RUN npm run build


# ── Stage 2: Runtime ─────────────────────────────────────────────────────────
FROM nginx:1.27-alpine

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Install our custom nginx config (reverse-proxy for /api, SPA fallback for /)
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled React bundle into nginx's web root
COPY --from=builder /build/dist /usr/share/nginx/html

# nginx listens on port 80 (single external entry-point)
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
