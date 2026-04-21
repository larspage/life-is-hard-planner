FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY apps/api/package.json ./apps/api/
COPY packages/shared/package.json ./packages/shared/

RUN yarn install --frozen-lockfile

COPY apps/api ./apps/api
COPY packages/shared ./packages/shared

WORKDIR /app/apps/api

RUN yarn db:generate

EXPOSE 4000

CMD ["yarn", "dev"]