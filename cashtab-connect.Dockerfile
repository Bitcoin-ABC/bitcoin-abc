# Node image for running npm publish for cashtab-connect
# NB cashtab-connect has no other local dependencies

# Stage 1
FROM node:20-bookworm-slim

WORKDIR /app/modules/cashtab-connect

# Copy all project files as they are required for building
COPY modules/cashtab-connect .
RUN npm ci

# Publish the module
CMD [ "npm", "publish" ]
