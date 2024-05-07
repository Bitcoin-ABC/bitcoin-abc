# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:20-buster-slim AS builder

# Build all local Cashtab dependencies

# ecashaddrjs
WORKDIR /app/modules/ecashaddrjs
COPY modules/ecashaddrjs/ .
RUN npm ci
RUN npm run build

# chronik-client
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# ecash-coinselect
WORKDIR /app/modules/ecash-coinselect
COPY modules/ecash-coinselect/ .
RUN npm ci

# ecash-script
WORKDIR /app/modules/ecash-script
COPY modules/ecash-script/ .
RUN npm ci

# Now that local dependencies are ready, build cashtab
WORKDIR /app/cashtab
# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY cashtab/package.json .
COPY cashtab/package-lock.json .

# Docker should not rebuild deps just because package.json version bump
# So, always keep package.json and package-lock.json at 1.0.0 in the docker image
# Note: it will be overwritten before npm run build by the latest package.json
RUN npm version --allow-same-version 1.0.0
RUN npm ci

# Copy the rest of the project files and build
COPY cashtab/ .
RUN npm run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY cashtab/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Set working directory to nginx asset directory
# Copy static assets from builder stage
COPY --from=builder /app/cashtab/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
