# ● Plan Algodón

**Plan Algodón** es una aplicación web progresiva de alto rendimiento diseñada para técnicos de telecomunicaciones y administradores, orientada a la auditoría, control y seguimiento geolocalizado de CTOs (Cajas de Terminales Ópticos) en campo. 

La plataforma está diseñada bajo un enfoque **Mobile-First** con interfaces de alto contraste para visibilidad en exteriores y bloqueo de zoom/desplazamientos para emular el comportamiento de una aplicación móvil nativa.

---

## 🌟 Características Principales

### 🗺️ Visualización de Campo Avanzada
- **Mapas de Google Maps:** Integración de capas de Google Maps (Normal, Satélite e Híbrido) junto a OpenStreetMap.
- **Nivel de Zoom Extremo:** Soporte para acercar el mapa hasta el nivel `21` para ubicar CTOs a nivel de tejado con máxima precisión.
- **Marcadores Dinámicos:** Los técnicos pueden cambiar la forma de sus marcadores (Círculo, Triángulo, Cuadrado, Rombo, Estrella) y ajustar su tamaño (de 4px a 12px) en tiempo real según sus preferencias de visibilidad.

### 👤 Perfil y Temas Visuales
- **Ajuste de Color de Página:** Incluye **10 temas de color premium** (Naranja, Azul, Verde, Morado, Oscuro, Indigo, Rosa, Teal, Ámbar, Pizarra) configurables por el usuario.
- **Persistencia de Preferencias:** Cada ajuste de visualización, tema y nivel de zoom mínimo se asocia y guarda en la base de datos para cada técnico.

### 📋 Gestión y Auditoría de CTOs
- **Categorías Duales:** Soporta la separación de CTOs en `"AUDITORIA"` (caja instalada) y `"PROGRAMADA"` (pendiente de instalar).
- **Subestados Dinámicos:** Los subestados se cargan y filtran de acuerdo a la categoría de la caja, con reglas específicas y color verde de éxito para estados de revisión.
- **Ocultación de Fibra:** Parámetros de puertos totales, ocupados y potencia (dBm) recogidos bajo un discreto botón de información `i` de **Iconoir**.
- **Historial Completo a Pantalla Completa:** Módulo para leer el historial de auditorías y enviar comentarios instantáneos desde un muro diseñado en pantalla completa.

### ⚡ Utilidades Administrativas
- **Importador Inteligente:** Carga masiva de CTOs desde hojas de cálculo Excel (`.xlsx`) limpiando entidades de caracteres especiales (`HTML Entities` como `&#047;` a `/`).
- **Compresión WhatsApp HD:** Procesamiento y compresión en servidor de fotos subidas (máx 1600px en el lado más largo, 80-85% calidad) configurable por el administrador.
- **Exportación ZIP Estructurada:** Generación de archivos ZIP descargables con todas las imágenes auditadas, estructuradas en carpetas automáticas según el número de CTO (`CTO_[num]/[num]_imagen_[idx].jpg`).

---

## 🛠️ Tecnologías y Dependencias

El proyecto está construido sobre un stack moderno y eficiente:

### Core & Framework
- **React 19.2.4**
- **Next.js 16.2.7 (App Router & Turbopack)**
- **TypeScript**

### Base de Datos & ORM
- **Prisma ORM 5.22.0**
- **PostgreSQL** (gestionado en producción)

### Mapas & GIS
- **Leaflet 1.9.4** & **React Leaflet 5.0.0**

### Procesamiento de Archivos y Utilidades
- **sharp 0.35.1:** Para la redimensión y compresión ultra-rápida de imágenes en servidor.
- **jszip 3.10.1:** Para empaquetar de forma asíncrona las fotos en archivos ZIP estructurados.
- **xlsx 0.18.5:** Para el análisis y procesamiento de archivos Excel importados.
- **next-auth 4.24.14:** Para la gestión de sesiones de usuario y seguridad de rutas basada en roles (`ADMIN` / `USER`).
- **bcryptjs 3.0.3:** Para la encriptación segura de contraseñas.
- **Iconoir Icons:** Iconografía outline minimalista y de alto contraste.

---

## 🚀 Instalación y Despliegue

### Requisitos Previos
- Node.js v18 o superior.
- Una base de datos PostgreSQL activa.

### Desarrollo Local

1. Instalar las dependencias del proyecto:
   ```bash
   npm install
   ```

2. Configurar el archivo de entorno `.env` en la raíz con la conexión de base de datos:
   ```env
   DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/algodon"
   NEXTAUTH_SECRET="tu-secreto-super-seguro"
   NEXTAUTH_URL="http://localhost:3000"
   ```

3. Aplicar las migraciones de base de datos y realizar el sembrado:
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

4. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

### Despliegue en Producción (Portainer / Docker)
Este proyecto incluye soporte para despliegue automatizado mediante contenedores Docker. En tu panel de **Portainer**:
1. Conecta el stack a tu repositorio de GitHub.
2. Ejecuta **"Pull and redeploy"** para descargar la última versión y reconstruir la imagen de producción.
3. Las variables globales de compresión y las rutas de streaming de imágenes `/api/uploads/[filename]` se configurarán automáticamente.

---

## 🏆 Créditos y Agradecimientos

Este proyecto ha sido desarrollado e iterado en colaboración con **Antigravity**, un asistente de inteligencia artificial para desarrollo de software diseñado por el equipo de **Advanced Agentic Coding en Google DeepMind**. 

Se han aplicado directrices avanzadas de diseño de interfaces web, optimizaciones de rendimiento en renderizado de mapas móviles, compresión eficiente de archivos en NodeJS y descodificación segura de estructuras de datos.
