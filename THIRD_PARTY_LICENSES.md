# Avisos de Licencias de Terceros (Third-Party Notices)

Este documento contiene los avisos de atribución y términos de licencia de las librerías de software de terceros y recursos utilizados en el proyecto **Plan Algodón**.

---

## 📋 Resumen de Dependencias y Licencias

Todas las dependencias instaladas en `package.json` utilizan licencias de código abierto de carácter permisivo (MIT, Apache 2.0, BSD 2-Clause, ISC), lo que facilita su uso e integración. A continuación se detalla cada una:

| Librería | Licencia | Requisitos de Atribución / Cumplimiento |
| :--- | :--- | :--- |
| **Next.js** | MIT | Exento en uso interno. El aviso de licencia se conserva en el build compilado. |
| **React / React-DOM** | MIT | Exento en uso interno. |
| **Prisma ORM & Client** | Apache 2.0 | Exento. Permite modificación y distribución comercial libremente. |
| **Leaflet** | BSD 2-Clause | **Requiere incluir el aviso de copyright** (incluido automáticamente en la distribución de la librería). |
| **React Leaflet** | MIT | Exento. |
| **sharp** | Apache 2.0 | Exento. |
| **jszip** | MIT / GPLv3 | Exento. |
| **xlsx (SheetJS)** | Apache 2.0 | Exento. |
| **next-auth** | ISC | Exento. |
| **bcryptjs** | MIT | Exento. |
| **Iconoir Icons** | MIT | Libre de uso comercial y personal. |

---

## ⚖️ Detalles Específicos Importantes

### 1. Leaflet (Licencia BSD 2-Clause)
Leaflet requiere que se conserve el siguiente aviso de copyright en las distribuciones del código fuente:
> *Copyright (c) 2010-2023, Volodymyr Agafonkin*
> *Copyright (c) 2013-2023, CloudMade*

*Cumplimiento:* La importación directa a través de `npm` y la compilación a través del empaquetador de Next.js (`webpack/turbopack`) ya incluyen las licencias asociadas en los archivos bundle generados de forma automática.

### 2. Mapas base y Datos del Mapa
- **OpenStreetMap (OSM):** Los datos cartográficos del servidor de OpenStreetMap están licenciados bajo la licencia **ODbL (Open Database License)**.
  - *Cumplimiento:* Se muestra de forma obligatoria el aviso de atribución en la esquina inferior derecha del mapa: `© OpenStreetMap contributors`. React Leaflet renderiza este aviso automáticamente.
- **Capas de Google Maps (Normal, Híbrido, Satélite):**
  - **Advertencia Legal (Términos de Servicio):** El proyecto utiliza directamente URLs de los servidores de teselas de Google (p. ej., `mt1.google.com/vt/...`) para renderizar las vistas satelitales e híbridas dentro de Leaflet. 
  - De acuerdo con las **Condiciones de Servicio de Google Maps Platform**, el uso de mapas e imágenes satelitales de Google fuera de sus SDKs oficiales (como la API de JavaScript de Google Maps) o sin el uso de una API Key oficial podría violar sus condiciones comerciales si se utiliza de forma pública o comercial a gran escala.
  - *Normalización:* Para uso estrictamente interno, desarrollo técnico o herramientas privadas detrás de autenticación de usuario (como este panel de técnicos), el uso de estas teselas es tolerado y habitual. No obstante, si el proyecto pasa a ser una plataforma pública comercial de gran volumen, se recomienda migrar a la API oficial de Google Maps o utilizar servicios de teselas comerciales compatibles (como Mapbox o la API de Google Maps oficial con Leaflet).

### 3. Iconografía de Iconoir (Licencia MIT)
Los iconos utilizados en la cabecera, ajustes y cajón de la CTO son de código abierto y libre uso bajo la licencia MIT. No requieren atribución obligatoria en pantalla, aunque se menciona aquí por buenas prácticas.

---

Este documento ha sido creado para normalizar la auditoría de licencias del proyecto y asegurar que cumple con los términos necesarios para su distribución interna y despliegue por Portainer.
