# Node image for running npm publish

# Stage 1
FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

# Set CI environment variable to avoid pnpm TTY prompts
ENV CI=true

# Set working directory to monorepo root
WORKDIR /app

# Copy workspace files (required for pnpm workspace)
COPY pnpm-workspace.yaml .
COPY pnpm-lock.yaml .
COPY package.json .

# Copy module package.json for dependency resolution
COPY modules/b58-ts/package.json ./modules/b58-ts/

# Copy module source files
COPY modules/b58-ts/ ./modules/b58-ts/

# Install dependencies using workspace filter
RUN pnpm install --frozen-lockfile --filter b58-ts...

# Build the module
RUN pnpm --filter b58-ts run build

# Publish the module (from monorepo root using filter)
CMD [ "pnpm", "--filter", "b58-ts", "publish" ]
