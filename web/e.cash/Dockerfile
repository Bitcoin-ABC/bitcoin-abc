FROM node:16

ARG PREVIEW_BUILD=next.config.js

COPY . .

COPY $PREVIEW_BUILD next.config.js

RUN npm ci
RUN npm run build

CMD ["npm", "start"]
