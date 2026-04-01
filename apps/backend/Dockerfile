# ── Stage 1: dependências de produção (com build tools para bcrypt) ──────────
FROM node:20-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# ── Stage 2: build TypeScript ─────────────────────────────────────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 3: imagem final (lean) ──────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001

# Usuário não-root
RUN addgroup -S app && adduser -S app -G app

# Copia node_modules compilados + dist
COPY --from=deps    /app/node_modules ./node_modules
COPY --from=builder /app/dist         ./dist

USER app

EXPOSE 3001

CMD ["node", "dist/main"]
