# Stage 1: Dependencies
FROM node:20-alpine AS deps

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias
RUN npm ci

# Stage 2: Builder
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar dependencias del stage anterior
COPY --from=deps /app/node_modules ./node_modules

# Copiar código fuente
COPY . .

# Build de NestJS
RUN npm run build

# Stage 3: Production Dependencies
FROM node:20-alpine AS prod-deps

WORKDIR /app

COPY package*.json ./

# Instalar SOLO dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Stage 4: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Instalar wget para health checks
RUN apk add --no-cache wget

# Crear usuario no-root
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nestjs

# Copiar node_modules de producción
COPY --from=prod-deps /app/node_modules ./node_modules

# Copiar archivos compilados
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

# Cambiar ownership
RUN chown -R nestjs:nodejs /app

# Usar usuario no-root
USER nestjs

# Exponer puerto 3000 (consistente)
EXPOSE 3000

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost:3000/v1/health || exit 1

# Iniciar directamente
CMD ["node", "dist/main.js"]
