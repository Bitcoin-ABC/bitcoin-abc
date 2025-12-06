# Node image for running npm publish

# Stage 1
FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/modules/b58-ts

# Copy all project files as they are required for building
COPY modules/b58-ts .
RUN pnpm install --frozen-lockfile

# Publish the module
CMD [ "pnpm", "publish" ]
