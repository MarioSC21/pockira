# Especificación del backend de Pockira

Estado: borrador inicial

Este directorio traduce la [especificación funcional](../spec/README.md) a decisiones del backend. Define el modelo de datos, las reglas de integridad y la autorización esperada antes de escribir migraciones o integrar el cliente con InsForge.

## Alcance inicial

El MVP necesita cuatro tablas propias:

| Tabla | Responsabilidad |
| --- | --- |
| `notes` | Contenido estructurado, título, propietario y estado de eliminación de una nota |
| `note_accesses` | Invitaciones y permisos de lectores o editores |
| `reminders` | Recordatorios privados de cada usuario para una nota |
| `user_preferences` | Última nota abierta y preferencias multiplataforma |

La identidad no se duplica en una tabla propia. Los usuarios y sus perfiles pertenecen a InsForge Authentication; las tablas de Pockira guardan el identificador de `auth.users.id`.

La definición detallada está en [Modelo de tablas](./tables.md).

El modelo también está disponible como [diagrama entidad-relación en SVG](./database-er-diagram.svg).

## Convenciones

- PostgreSQL es la fuente de verdad.
- Los identificadores del dominio usan `uuid`.
- Todas las fechas se guardan como `timestamptz` en UTC.
- Los nombres SQL usan `snake_case`.
- El contenido de Tiptap se conserva como documento JSON en `jsonb`, no como HTML.
- El título vacío se guarda como cadena vacía; `Sin título` es solamente una representación de la interfaz.
- Toda tabla expuesta al cliente tiene Row-Level Security habilitado.
- Las migraciones serán SQL versionado y de avance único.

## Orden previsto de implementación

1. Crear tipos, tablas, restricciones e índices.
2. Añadir funciones auxiliares de autorización sin eludir RLS.
3. Habilitar RLS y crear las políticas.
4. Añadir triggers de `updated_at` y eventos Realtime.
5. Probar cada rol con dos cuentas distintas antes de conectar el frontend.

## Fuera de este borrador

- El SQL ejecutable de las migraciones.
- La configuración de Google OAuth.
- La entrega de notificaciones del sistema.
- La sincronización CRDT o la edición simultánea carácter por carácter.
- El almacenamiento de archivos adjuntos.

## Referencias

- [Database de InsForge](https://docs.insforge.dev/core-concepts/database/overview)
- [Database migrations de InsForge](https://docs.insforge.dev/core-concepts/database/migrations)
- [Authentication de InsForge](https://docs.insforge.dev/core-concepts/authentication/overview)
- [Realtime de InsForge](https://docs.insforge.dev/core-concepts/realtime/overview)
