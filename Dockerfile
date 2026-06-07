ARG NODE_VERSION=21.1.0

FROM node:${NODE_VERSION}-alpine as base

WORKDIR /usr/src/app

RUN apk add --no-cache curl

COPY package.json package.json
COPY package-lock.json package-lock.json

RUN npm i --force

COPY . .

RUN  npm run db:sync

RUN npm run build

EXPOSE 3070
CMD npm start