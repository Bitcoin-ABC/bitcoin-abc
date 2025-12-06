# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:22-bookworm AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy package.json files for dependency resolution
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY web/chronik.e.cash/package.json ./web/chronik.e.cash/

# Fetch dependencies (pnpm best practice for Docker)
RUN pnpm fetch --frozen-lockfile

# Copy source files
COPY modules/ecashaddrjs/ ./modules/ecashaddrjs/
COPY modules/chronik-client/ ./modules/chronik-client/
COPY web/chronik.e.cash/ ./web/chronik.e.cash/

# Install dependencies for local modules first
RUN pnpm install --frozen-lockfile --offline --filter ecashaddrjs...
RUN pnpm install --frozen-lockfile --offline --filter chronik-client...

# Build local modules
RUN pnpm --filter ecashaddrjs run build
RUN pnpm --filter chronik-client run build

# Install dependencies for chronik.e.cash (now that local modules are built)
RUN pnpm install --frozen-lockfile --offline --filter chronik.e.cash...

# If you do not have an .abclatestversion file, create one by copying .abclatestversion.sample
# Note, in CI, you must create .abclatestversion before running this Dockerfile
RUN if [ ! -f web/chronik.e.cash/.abclatestversion ]; then mv web/chronik.e.cash/.abclatestversion.sample web/chronik.e.cash/.abclatestversion; fi

# Build chronik.e.cash from monorepo root
RUN pnpm --filter chronik.e.cash run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY web/chronik.e.cash/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Copy static assets from builder stage
COPY --from=builder /app/web/chronik.e.cash/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
