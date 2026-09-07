FROM node:22-alpine

WORKDIR /app

COPY backend/package.json ./
RUN npm install --omit=dev

COPY backend/src ./src
COPY backend/scripts ./scripts
COPY backend/migrations ./migrations
COPY food-catalog.js /food-catalog.js

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "src/server.js"]
