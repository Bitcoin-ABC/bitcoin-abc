# Node image for running npm publish

# Stage 1
FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

# Build chronik-client
WORKDIR /app/modules/ecashaddrjs

# Copy all project files as they are required for building
COPY modules/ecashaddrjs .
# Install ecashaddrjs from npm, so that module users install it automatically
RUN pnpm install --frozen-lockfile
RUN pnpm run build

# Publish the module
CMD [ "pnpm", "publish" ]
