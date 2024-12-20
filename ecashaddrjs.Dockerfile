# Node image for running npm publish

# Stage 1
FROM node:20-bookworm-slim

# Build chronik-client
WORKDIR /app/modules/ecashaddrjs

# Copy all project files as they are required for building
COPY modules/ecashaddrjs .
# Install ecashaddrjs from npm, so that module users install it automatically
RUN npm ci
RUN npm run build

# Publish the module
CMD [ "npm", "publish" ]
