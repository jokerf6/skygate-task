ARG NODE_VERSION=21.1.0

FROM node:${NODE_VERSION}-alpine AS builder

WORKDIR /usr/src/app

RUN apk add --no-cache openssl

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build


FROM node:${NODE_VERSION}-alpine AS runner

WORKDIR /usr/src/app

RUN apk add --no-cache openssl curl netcat-openbsd

ENV NODE_ENV=production

COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/tsconfig*.json ./
COPY --from=builder /usr/src/app/src ./src
COPY i18n ./i18n
COPY --from=builder /usr/src/app/docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x docker-entrypoint.sh && \
    mkdir -p uploads logs && \
    chown -R node:node /usr/src/app

EXPOSE 3030

USER node

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/src/main.js"]
