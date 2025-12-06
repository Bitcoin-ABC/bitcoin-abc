# Node image for running npm publish for cashtab-connect
# NB cashtab-connect has no other local dependencies

# Stage 1
FROM node:22-bookworm-slim

# Install pnpm
RUN npm install -g pnpm

WORKDIR /app/modules/cashtab-connect

# Copy all project files as they are required for building
COPY modules/cashtab-connect .
RUN pnpm install --frozen-lockfile

# Publish the module
CMD [ "pnpm", "publish" ]
