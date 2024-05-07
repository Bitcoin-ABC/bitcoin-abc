# Node image for running npm publish

# Stage 1
FROM node:20-buster-slim

# Build out local dependencies of ecash-lib
# chronik-client
WORKDIR /app/modules/chronik-client
COPY modules/chronik-client/ .
RUN npm ci
RUN npm run build

# Copy ecash-lib and ecash-lib-wasm files to same directory structure as monorepo
WORKDIR /app/modules/ecash-lib
COPY modules/ecash-lib .
WORKDIR /app/modules/ecash-lib-wasm
COPY modules/ecash-lib-wasm .

# Build web assembly for ecash-lib
RUN ./build-wasm.sh

# Build ecash-lib
WORKDIR /app/modules/ecash-lib
RUN npm ci
RUN npm run build

# Publish ecash-lib
CMD [ "npm", "publish" ]
