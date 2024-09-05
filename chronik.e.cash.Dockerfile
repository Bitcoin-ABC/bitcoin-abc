# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:20-buster-slim AS builder

# Build ecashaddrjs, local dependency of chronik-client
WORKDIR /app/modules/ecashaddrjs
COPY modules/ecashaddrjs/ .
RUN npm ci
RUN npm run build

# First, copy chronik-client and install its dependencies at the same relative path
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# Then, copy and build chronik.e.cash
WORKDIR /app/web/chronik.e.cash/
COPY web/chronik.e.cash/package.json .
COPY web/chronik.e.cash/package-lock.json .
RUN npm ci

# Copy everything in web/chronik.e.cash
COPY web/chronik.e.cash/ .
# If you do not have an .abclatestversion file, create one by copying .abclatestversion.sample
# Note, in CI, you must create .abclatestversion before running this Dockerfile
RUN if [ ! -f .abclatestversion ]; then mv .abclatestversion.sample .abclatestversion; fi
RUN npm run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY web/chronik.e.cash/$NGINX_CONF /etc/nginx/conf.d/default.conf
# Copy static assets from builder stage
COPY --from=builder /app/web/chronik.e.cash/build /usr/share/nginx/html/
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
