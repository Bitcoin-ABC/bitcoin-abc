# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:20-buster-slim AS builder

# Build ecashaddrjs, local dependency of chronik-client
WORKDIR /app/ecashaddrjs
COPY ecashaddrjs/ .
RUN npm ci
RUN npm run build

# First, copy chronik-client and install its dependencies at the same relative path
WORKDIR /app/chronik-client
COPY chronik-client/ .
RUN npm ci
RUN npm run build

# Then, copy and build docs
WORKDIR /app/docs/chronik.e.cash/
COPY docs/chronik.e.cash/package.json .
COPY docs/chronik.e.cash/package-lock.json .
RUN npm ci
# Copy everything in docs/chronik.e.cash
COPY docs/chronik.e.cash/ .
# If you do not have an .abclatestversion file, create one by copying .abclatestversion.sample
# Note, in CI, you must create .abclatestversion before running this Dockerfile
RUN if [ ! -f .abclatestversion ]; then mv .abclatestversion.sample .abclatestversion; fi
RUN npm run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY docs/chronik.e.cash/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Copy static assets from builder stage
COPY --from=builder /app/docs/chronik.e.cash/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
