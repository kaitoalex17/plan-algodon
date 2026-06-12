FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Instalar dependencias del sistema necesarias para Prisma en Alpine
RUN apk add --no-cache libc6-compat openssl

# Instalar dependencias
COPY package.json package-lock.json* ./
RUN npm install

# Copiar el resto del código
COPY . .

# Generar el cliente de Prisma
RUN npx prisma generate

# Construir la aplicación Next.js
RUN npm run build

# Exponer el puerto
EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"
ENV NODE_ENV production

# Al iniciar el contenedor: sincronizar base de datos y arrancar la app
CMD npx prisma db push && npm run start
