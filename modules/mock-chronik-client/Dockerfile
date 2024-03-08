# Node image for running npm publish

# Stage 1
FROM node:20-buster-slim AS builder

# Install some dependencies before building
RUN apt-get update && apt-get upgrade -y 

WORKDIR /app

# Copy only the package files and install necessary dependencies.
# This reduces cache busting when source files are changed.
COPY package.json .
COPY package-lock.json .
RUN npm ci

# Copy the rest of the project files
COPY . .

# Publish the module
CMD [ "npm", "publish" ]
