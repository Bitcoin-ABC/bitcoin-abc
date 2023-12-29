# Node image for running npm publish

# Stage 1
FROM node:16-buster-slim

# Install some dependencies before building
RUN apt-get update && apt-get upgrade -y 

WORKDIR /app

# Copy all project files as they are required for building
COPY . .
RUN npm ci

# Publish the module
CMD [ "npm", "publish" ]
