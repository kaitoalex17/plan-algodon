FROM node:20-alpine

ENV NEXT_TELEMETRY_DISABLED=1

WORKDIR /app

# Dependencias del sistema para Prisma en Alpine
RUN apk add --no-cache libc6-compat openssl

# Instalar dependencias npm
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# Copiar el resto del código
COPY . .

# Construir Next.js SIN prisma generate (lo haremos en runtime)
RUN npm run build

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Al arrancar el contenedor: generar prisma, hacer db push y lanzar la app
CMD npx prisma generate && npx prisma db push && npm run start
