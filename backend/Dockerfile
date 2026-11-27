FROM node:22-alpine
WORKDIR /app
RUN apk add --no-cache openssl && corepack enable
COPY shared /app/shared
COPY backend /app/backend
WORKDIR /app/backend
RUN corepack pnpm install --frozen-lockfile && corepack pnpm db:generate
EXPOSE 3000
CMD ["corepack","pnpm","dev"]
