# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:22-bookworm AS builder

# Install pnpm
RUN npm install -g pnpm

# Set working directory to monorepo root
WORKDIR /app

# Set CI environment variable to avoid pnpm TTY prompts
ENV CI=true

# Copy workspace files
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Create .npmrc to hoist typedoc-plugin-markdown so typedoc can find it
# This is needed because pnpm's strict mode doesn't hoist plugins by default
RUN echo "public-hoist-pattern[]=*typedoc-plugin-markdown*" > .npmrc

# Copy package.json files for dependency resolution
COPY modules/ecashaddrjs/package.json ./modules/ecashaddrjs/
COPY modules/chronik-client/package.json ./modules/chronik-client/
COPY web/chronik.e.cash/package.json ./web/chronik.e.cash/

# Fetch dependencies (pnpm best practice for Docker)
# This fetches all packages (including devDependencies) into the virtual store
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

# Install dependencies for chronik-docs (now that local modules are built)
# Note: package name is "chronik-docs", not "chronik.e.cash"
# Remove --offline to ensure all devDependencies are properly linked
RUN pnpm install --frozen-lockfile --filter chronik-docs...

# If you do not have an .abclatestversion file, create one by copying .abclatestversion.sample
# Note, in CI, you must create .abclatestversion before running this Dockerfile
RUN if [ ! -f web/chronik.e.cash/.abclatestversion ]; then mv web/chronik.e.cash/.abclatestversion.sample web/chronik.e.cash/.abclatestversion; fi

# Build chronik-docs from monorepo root
RUN pnpm --filter chronik-docs run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY web/chronik.e.cash/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Copy static assets from builder stage
COPY --from=builder /app/web/chronik.e.cash/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
