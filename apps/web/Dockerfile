FROM node:18-alpine

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./
COPY apps/web/package.json ./apps/web/
COPY packages/shared/package.json ./packages/shared/

RUN yarn install --frozen-lockfile

COPY apps/web ./apps/web
COPY packages/shared ./packages/shared

WORKDIR /app/apps/web

RUN yarn build

EXPOSE 3000

CMD ["yarn", "start"]