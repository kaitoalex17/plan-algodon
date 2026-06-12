FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma en Alpine
RUN apk add --no-cache libc6-compat openssl

# Instalar dependencias
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Generar el cliente de Prisma (necesita URL aunque sea dummy en build time)
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN npx prisma generate

# Construir la aplicación Next.js
RUN npm run build

# Exponer el puerto
EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Al iniciar: sincronizar BD real y arrancar
CMD npx prisma db push && npm run start
