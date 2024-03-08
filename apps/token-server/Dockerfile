# Node image for token-server

FROM node:20-buster-slim

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

# Compile typescript. Outputs to dist/ dir
RUN npm run build

# App runs with "node dist/index.js"
CMD [ "node", "dist/index.js" ]
