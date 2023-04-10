FROM node:16

COPY . .

RUN npm ci
RUN npm run build

CMD ["npm", "start"]
