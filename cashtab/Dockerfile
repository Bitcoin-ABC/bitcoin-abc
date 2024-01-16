# Multi-stage
# 1) Node image for building frontend assets
# 2) nginx stage to serve frontend assets

# Stage 1
FROM node:16-buster-slim AS builder

# Install some dependencies before building
RUN apt-get update && \
  apt-get upgrade -y && \
  apt-get install -y git && \
  apt-get install -y python

WORKDIR /app

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy the rest of the project files and build
COPY . .
RUN npm run build

# Stage 2
FROM nginx

ARG NGINX_CONF=nginx.conf

COPY $NGINX_CONF /etc/nginx/conf.d/default.conf
# Set working directory to nginx asset directory
# Copy static assets from builder stage
COPY --from=builder /app/build /usr/share/nginx/html/
EXPOSE 80
# Containers run nginx with global directives and daemon off
ENTRYPOINT ["nginx", "-g", "daemon off;"]
