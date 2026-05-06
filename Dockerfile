# Étape 1 : compilation des dépendances natives (sqlite3 nécessite python3 + make + g++)
FROM node:20-alpine AS builder

RUN apk add --no-cache python3 make g++

WORKDIR /app
COPY package*.json ./
RUN npm install --production

# Étape 2 : image finale légère sans les outils de build
FROM node:20-alpine

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY server.js ./
COPY public/ ./public/

ENV PORT=3030
ENV DATA_DIR=/data

EXPOSE 3030

CMD ["node", "server.js"]
