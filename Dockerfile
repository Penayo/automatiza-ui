# Build stage
FROM node:22-alpine AS builder

WORKDIR /app

RUN npm install -g pnpm@10.32.1

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

# VITE_API_HOST must point to /api so nginx proxies calls to the engine
ARG VITE_API_HOST=/api
ARG VITE_CRYPTO_KEY
ENV VITE_API_HOST=$VITE_API_HOST
ENV VITE_CRYPTO_KEY=$VITE_CRYPTO_KEY

RUN NODE_OPTIONS=--max-old-space-size=4096 pnpm run build

# Production stage
FROM nginx:1.27-alpine AS production

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
