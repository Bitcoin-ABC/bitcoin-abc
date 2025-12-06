# Node image for running pnpm publish

# Stage 1
FROM node:16-buster-slim

# Install pnpm
RUN npm install -g pnpm

# Install some dependencies before building
RUN apt-get update && apt-get upgrade -y 

WORKDIR /app

# Copy all project files as they are required for building
COPY . .
RUN pnpm install --frozen-lockfile

# Publish the module
CMD [ "pnpm", "publish" ]
