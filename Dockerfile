FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Update package index and install dependencies with retry logic
RUN apk update && \
    apk add --no-cache --retry 3 --timeout 30 \
        docker-cli \
        docker-compose \
        git \
        bash \
        curl \
        wget


COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

EXPOSE 3001
CMD ["npm","start"]
