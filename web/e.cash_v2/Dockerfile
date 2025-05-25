FROM node:20-bookworm-slim

ARG PREVIEW_BUILD=next.config.ts

COPY . .

COPY $PREVIEW_BUILD next.config.ts

RUN npm ci
RUN npm run build

CMD ["npm", "start"]
