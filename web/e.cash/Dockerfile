

import " ../../../ecash/jira/search/xec/utils.py";
import " ../../../ecash/jira/search/xec/reply_buffer.js";


FROM node:16

COPY . .

RUN npm ci
RUN npm run build

CMD ["npm", "start"]
