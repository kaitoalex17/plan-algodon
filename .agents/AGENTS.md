# Estructura de Base de Datos (Prisma ORM) - Plan Algodón

**Tecnología**: PostgreSQL (Prisma ORM)
**Ubicación**: Servidor remoto gestionado mediante contenedores Docker con Portainer (acceso a través de DATABASE_URL configurado en el archivo .env).

## Modelos y Relaciones Clave:

### User (Usuario / Técnico / Auditor)
*   **Propósito**: Almacena credenciales, roles y preferencias visuales del mapa.
*   **Campos clave**:
    *   `role`: "ADMIN", "GESTOR" o "USER" / "AUDITOR".
    *   `color`: Color HEX propio del técnico (para rellenar sus marcadores asignados).
    *   **Ajustes de mapa**: `markerShape` (círculo, estrella, cuadrado...), `markerSize` (tamaño), `patternCorrecto` y `patternFallo` (patrones visuales configurados en el perfil), `zoomThreshold`, `showProgramadas`.

### CTO (Caja Terminal Óptica)
*   **Propósito**: Representa cada punto/caja de fibra registrada en el mapa.
*   **Campos clave**:
    *   `num` (código de CTO), `lat` y `lng` (geolocalización).
    *   `category`: "AUDITORIA" o "PROGRAMADA".
    *   `status`: "PENDIENTE", "CORRECTO", "REVISADO" o "FALLO".
    *   **Campos de Drive**: `driveSyncStatus` ("NONE", "SYNCED", "ERROR") y `driveFolderLink` (enlace a la carpeta de Google Drive).
*   **Relaciones**:
    *   `createdBy`: Usuario que la dio de alta en campo.
    *   `assignedTo`: Técnico encargado del trabajo.
    *   `auditedBy`: Auditor que verificó el estado.
    *   `subStatus`: Subestado específico (relacionado con el modelo SubStatus).

### SubStatus (Subestados)
*   **Propósito**: Categoriza los detalles del estado de una CTO (ej. "EN CONSTRUCCIÓN", "Aceptada"...). Cada subestado tiene un color HEX asignado.

### Comment (Muro de Comentarios)
*   **Propósito**: Comentarios de visitas vinculados a una CTO e introduce el ID del usuario que los creó.

### Image (Evidencias Fotográficas)
*   **Propósito**: Enlaces locales a las fotografías de evidencias (`url` apuntando a `/api/uploads/filename.jpg`) pertenecientes a una CTO.

### History (Historial de Cambios)
*   **Propósito**: Auditoría de acciones de usuarios sobre cada CTO (cambios de estado, reasignaciones, etc.) con marcas de tiempo (`timestamp`) y geolocalización o IP opcional.

### Setting (Ajustes Globales del Sistema)
*   **Propósito**: Almacena variables clave-valor globales como `imageQuality`, `imageMaxWidth`, configuración de email y `driveEnabled`.
