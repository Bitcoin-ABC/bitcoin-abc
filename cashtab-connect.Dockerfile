# Node image for running npm publish for cashtab-connect
# NB cashtab-connect has no other local dependencies

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
COPY modules/cashtab-connect/package.json ./modules/cashtab-connect/

# Copy module source files
COPY modules/cashtab-connect/ ./modules/cashtab-connect/

# Install dependencies using workspace filter
RUN pnpm install --frozen-lockfile --filter cashtab-connect...

# Build the module
RUN pnpm --filter cashtab-connect run build

# Publish the module (from monorepo root using filter)
CMD [ "pnpm", "--filter", "cashtab-connect", "publish" ]
