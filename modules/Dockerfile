# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:20-buster-slim AS builder

# First, copy chronik-client and install its dependencies at the same relative path
WORKDIR /app/chronik-client
COPY chronik-client/ .
RUN npm ci

# Then, copy and build docs
WORKDIR /app/chronik.e.cash/
COPY docs/chronik.e.cash/package.json .
COPY docs/chronik.e.cash/package-lock.json .
RUN npm ci
COPY docs/chronik.e.cash/ .
RUN npm run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY docs/chronik.e.cash/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Copy static assets from builder stage
COPY --from=builder /app/chronik.e.cash/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
