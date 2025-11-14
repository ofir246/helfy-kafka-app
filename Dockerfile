FROM node:20-alpine

WORKDIR /usr/src/app

COPY app/package.json ./

RUN npm install --only=production

COPY app/server.js ./

EXPOSE 3000

CMD ["npm", "start"]
