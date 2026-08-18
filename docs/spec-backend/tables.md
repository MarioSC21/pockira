# Modelo de tablas

Estado: propuesta para el MVP

Vista visual: [diagrama entidad-relación del modelo en SVG](./database-er-diagram.svg).

## Relaciones

```text
auth.users
  |--< notes.owner_id
  |--< note_accesses.user_id
  |--< note_accesses.invited_by
  |--< reminders.user_id
  `--- user_preferences.user_id

notes
  |--< note_accesses.note_id
  |--< reminders.note_id
  `--< user_preferences.last_opened_note_id
```

`auth.users` es una tabla administrada por InsForge y no forma parte de las migraciones de Pockira.

## `notes`

Una fila por nota. El propietario se guarda directamente en la nota y no se repite en `note_accesses`.

| Columna | Tipo | Nulable | Regla |
| --- | --- | --- | --- |
| `id` | `uuid` | No | Clave primaria; UUID generado en la base de datos |
| `owner_id` | `uuid` | No | Referencia a `auth.users.id`; no cambia después de crear la nota |
| `title` | `text` | No | Valor predeterminado `''` |
| `content` | `jsonb` | No | Documento Tiptap; valor predeterminado compatible con un documento vacío |
| `created_at` | `timestamptz` | No | Fecha de creación generada por la base de datos |
| `updated_at` | `timestamptz` | No | Se actualiza mediante trigger en cada cambio persistido |
| `deleted_at` | `timestamptz` | Sí | `NULL` para una nota activa; fecha para eliminación lógica |

Restricciones:

- `content` debe ser un objeto JSON y representar un nodo raíz Tiptap de tipo `doc`.
- `owner_id` es inmutable en el MVP. Una transferencia futura necesitará una operación confiable y una especificación propia.
- El backend debe fijar `owner_id` con `auth.uid()` al insertar; no debe confiar en un identificador enviado libremente por el cliente.
- Una nota eliminada no aparece en consultas normales ni acepta nuevas ediciones o accesos.

Índices:

- `(owner_id, updated_at DESC)` con condición `deleted_at IS NULL`, para la lista de notas propias.
- `(updated_at DESC)` con condición `deleted_at IS NULL`, como apoyo a listados autorizados.

## `note_accesses`

Una fila representa una invitación o acceso concedido. Permite invitar por correo antes de que exista una cuenta de Pockira.

| Columna | Tipo | Nulable | Regla |
| --- | --- | --- | --- |
| `id` | `uuid` | No | Clave primaria |
| `note_id` | `uuid` | No | Referencia a `notes.id`; eliminación en cascada |
| `user_id` | `uuid` | Sí | Referencia a `auth.users.id`; se completa al aceptar o vincular la invitación |
| `invited_email` | `text` | No | Correo normalizado con `lower(trim(email))` |
| `role` | enum | No | Solamente `editor` o `reader` |
| `status` | enum | No | `pending`, `accepted` o `revoked` |
| `invited_by` | `uuid` | No | Referencia al propietario que creó la invitación |
| `created_at` | `timestamptz` | No | Fecha de creación |
| `accepted_at` | `timestamptz` | Sí | Fecha de aceptación o vinculación |
| `revoked_at` | `timestamptz` | Sí | Fecha de revocación |
| `updated_at` | `timestamptz` | No | Último cambio de rol o estado |

Restricciones:

- El propietario de la nota no puede aparecer como colaborador.
- `invited_by` debe coincidir con `notes.owner_id`.
- Un acceso `accepted` necesita `user_id` y `accepted_at`.
- Un acceso `revoked` necesita `revoked_at` y deja de autorizar inmediatamente.
- La vinculación de `user_id` debe realizarse en código confiable del backend tras comprobar el correo autenticado. El cliente no puede adjudicarse una invitación.
- Debe existir como máximo un acceso no revocado por `(note_id, invited_email)` y por `(note_id, user_id)` cuando `user_id` no sea nulo.

Índices:

- Índice único parcial `(note_id, invited_email)` donde `status <> 'revoked'`.
- Índice único parcial `(note_id, user_id)` donde `user_id IS NOT NULL AND status <> 'revoked'`.
- `(user_id, updated_at DESC)` donde `status = 'accepted'`, para notas compartidas.
- `(invited_email, created_at DESC)` donde `status = 'pending'`, para vincular invitaciones después del primer acceso.

No se almacena un rol `owner`: la propiedad se deriva siempre de `notes.owner_id`. Así se evita tener dos fuentes de verdad.

## `reminders`

Un recordatorio pertenece al usuario que lo creó, aunque la nota sea compartida.

| Columna | Tipo | Nulable | Regla |
| --- | --- | --- | --- |
| `id` | `uuid` | No | Clave primaria |
| `note_id` | `uuid` | No | Referencia a `notes.id`; eliminación en cascada |
| `user_id` | `uuid` | No | Referencia a `auth.users.id` |
| `remind_at` | `timestamptz` | No | Momento programado |
| `status` | enum | No | `scheduled`, `completed` o `cancelled` |
| `created_at` | `timestamptz` | No | Fecha de creación |
| `updated_at` | `timestamptz` | No | Fecha de última modificación |
| `completed_at` | `timestamptz` | Sí | Obligatoria cuando el estado es `completed` |

Restricciones:

- El usuario necesita acceso de lectura activo a la nota al crear o modificar el recordatorio.
- Solo `user_id` puede leer, modificar o eliminar la fila.
- Revocar el acceso a una nota impide administrar sus recordatorios y debe cancelar o retirar de la programación los que sigan activos. Se conservará la fila hasta decidir una política de retención.
- Un recordatorio está vencido cuando `status = 'scheduled' AND remind_at < now()`; no necesita un estado persistido adicional.

Índices:

- `(user_id, remind_at)` donde `status = 'scheduled'`, para próximos y vencidos.
- `(note_id, user_id)`, para consultar los recordatorios de una nota.

El modelo admite varios recordatorios por nota y usuario. Si el producto decide permitir solamente uno, se añadirá un índice único parcial sobre `(note_id, user_id)` para `status = 'scheduled'`.

## `user_preferences`

Una fila opcional por usuario. Se crea de manera perezosa al guardar la primera preferencia.

| Columna | Tipo | Nulable | Regla |
| --- | --- | --- | --- |
| `user_id` | `uuid` | No | Clave primaria y referencia a `auth.users.id`; eliminación en cascada |
| `last_opened_note_id` | `uuid` | Sí | Referencia a `notes.id`; al borrar la nota pasa a `NULL` |
| `timezone` | `text` | Sí | Zona IANA usada para mostrar y programar recordatorios |
| `created_at` | `timestamptz` | No | Fecha de creación |
| `updated_at` | `timestamptz` | No | Fecha de última modificación |

Restricciones:

- `last_opened_note_id` solo puede apuntar a una nota que el usuario pueda leer en ese momento.
- Si se revoca el acceso a esa nota, el backend limpia la preferencia o la apertura inicial ignora el valor y elige otra nota accesible.
- Solo el propio usuario puede leer o modificar su fila.

## Matriz de autorización RLS

| Operación | Propietario | Editor aceptado | Lector aceptado | Sin acceso |
| --- | --- | --- | --- | --- |
| Leer una nota activa | Sí | Sí | Sí | No |
| Editar título o contenido | Sí | Sí | No | No |
| Eliminar una nota | Sí | No | No | No |
| Leer colaboradores | Sí | Su propio acceso | Su propio acceso | No |
| Invitar, cambiar rol o revocar | Sí | No | No | No |
| Administrar un recordatorio | Solo el suyo | Solo el suyo | Solo el suyo | No |
| Administrar preferencias | Solo las suyas | Solo las suyas | Solo las suyas | No |

Las políticas deben consultar `auth.uid()` y las filas aceptadas de `note_accesses`. Ocultar controles en la interfaz no sustituye estas comprobaciones.

Cualquier usuario autenticado puede crear una nota nueva, y la base de datos debe asignarle la propiedad con `owner_id = auth.uid()`.

## Realtime

Se publicarán eventos después de confirmar la transacción:

| Cambio | Canal sugerido | Uso |
| --- | --- | --- |
| Actualización de `notes` | `note:<note_id>` | Refrescar contenido y metadatos guardados |
| Cambio de `note_accesses` | `note-access:<note_id>` | Aplicar cambios de rol o revocaciones |
| Cambio de `reminders` | `user-reminders:<user_id>` | Actualizar recordatorios del usuario |

La suscripción a cada canal también debe estar protegida por RLS. El payload de revocación debe contener solo los identificadores necesarios y nunca exponer correos a usuarios que no administran la nota.

## Decisiones pendientes antes de migrar

1. Confirmar si la papelera forma parte del MVP. Si no, se elimina `deleted_at` y se usa borrado físico con cascada.
2. Confirmar si se permite uno o varios recordatorios activos por nota y usuario.
3. Definir el JSON mínimo de Tiptap que se usará como valor predeterminado y la profundidad de su validación en la base de datos.
4. Definir cuánto tiempo se conservan accesos revocados y recordatorios completados o cancelados.
5. Confirmar la estrategia de concurrencia. Si se necesita detección de escrituras obsoletas, añadir `revision bigint` o exigir `updated_at` como precondición.
