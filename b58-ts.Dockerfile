# Node image for running npm publish

# Stage 1
FROM node:20-bookworm-slim

WORKDIR /app/modules/b58-ts

# Copy all project files as they are required for building
COPY modules/b58-ts .
RUN npm ci

# Publish the module
CMD [ "npm", "publish" ]
