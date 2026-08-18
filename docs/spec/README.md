# Especificación funcional de Pockira

Estado: borrador inicial

Este directorio contiene las decisiones funcionales del producto. La especificación describe qué debe hacer Pockira y sirve como fuente para crear flujos, historias de usuario y tareas de implementación. Las decisiones técnicas reutilizables permanecen en `docs/architecture` y `docs/setup`.

## Visión

Pockira es una aplicación de notas minimalista y rápida para web, escritorio y Android. Su experiencia de apertura debe parecerse a la inmediatez de un editor como Sublime Text: abrir la aplicación, recuperar la última nota utilizada y continuar escribiendo con la menor fricción posible.

El contenido puede enriquecerse cuando el usuario lo necesite, pero la interfaz no debe sentirse como un gestor de documentos complejo. La referencia conceptual es un editor flexible parecido a Notion, reducido a las funciones esenciales de notas.

## Plataformas del alcance inicial

- Web.
- Aplicación de escritorio mediante Tauri.
- Android mediante Tauri.

iOS no forma parte del primer alcance funcional, aunque la base multiplataforma debe permitir incorporarlo posteriormente.

## Principios del producto

1. Escribir primero: la pantalla principal prioriza el contenido de la nota.
2. Inicio inmediato: después de autenticarse, se abre la última nota utilizada.
3. Guardado transparente: el usuario no necesita pulsar un botón para conservar sus cambios.
4. Complejidad progresiva: las herramientas de formato aparecen únicamente cuando son necesarias.
5. Colaboración controlada: cada persona invitada recibe solamente los permisos concedidos.
6. Consistencia multiplataforma: las funciones principales se comportan igual en web, escritorio y Android.

## Alcance del MVP

### Autenticación

- El acceso requiere una cuenta.
- Google OAuth es el único método de registro e inicio de sesión del MVP.
- No habrá contraseña, magic link ni otros proveedores durante esta fase.
- La sesión debe persistir entre aperturas mientras siga siendo válida.
- Al cerrar sesión se elimina el acceso local a información privada de la cuenta.

### Notas

El usuario puede:

- Crear una nota.
- Abrir una nota existente.
- Editar el título y el contenido.
- Consultar una lista simple de sus notas y de las notas compartidas con él.
- Eliminar una nota propia con confirmación.
- Recuperar automáticamente la última nota abierta al iniciar la aplicación.

Una nota tiene inicialmente:

- Identificador.
- Propietario.
- Título; cuando esté vacío se muestra `Sin título`.
- Contenido enriquecido de Tiptap.
- Fecha de creación.
- Fecha de última modificación.
- Estado de eliminación, si se implementa papelera.

El orden predeterminado de la lista es por última modificación descendente.

### Editor enriquecido

Tiptap será el motor del editor. El MVP debe incluir:

- Párrafos.
- Encabezados.
- Negrita, cursiva y tachado.
- Listas con viñetas y numeradas.
- Listas de tareas.
- Citas y bloques de código.
- Enlaces.
- Color de texto y resaltado.
- Deshacer y rehacer.

Cuando se selecciona texto, aparece un menú contextual sobre la selección. Desde ese menú se aplican las acciones relevantes, como cambiar el tipo de texto, el formato y los colores. La interfaz visual del menú pertenece a Pockira; Tiptap aporta el estado y los comandos del editor.

El contenido se guarda en un formato estructurado de Tiptap, no solamente como HTML. Esto permite conservar la semántica del documento y evolucionar el editor.

### Guardado y sincronización

- Los cambios se guardan automáticamente después de una pausa breve de escritura.
- La edición no debe bloquearse mientras el guardado está en curso.
- La interfaz muestra los estados `Guardando`, `Guardado` y `Sin conexión` cuando correspondan.
- Al cambiar de nota o cerrar la ventana se intenta persistir cualquier cambio pendiente.
- Todas las plataformas consultan el mismo contenido asociado a la cuenta.
- Las actualizaciones recibidas desde otra sesión deben reflejarse sin recargar manualmente la página.

La edición completa sin conexión y la estrategia de resolución de conflictos necesitan una especificación posterior. El MVP puede conservar temporalmente el borrador local, pero no promete todavía edición offline ilimitada.

### Recordatorios

- Una nota puede tener un recordatorio opcional con fecha y hora.
- El usuario puede crear, modificar o eliminar el recordatorio.
- El recordatorio pertenece al usuario que lo creó, no a todos los colaboradores de la nota.
- La aplicación debe mostrar los recordatorios próximos y vencidos.
- La entrega de notificaciones debe adaptarse a las capacidades de web, escritorio y Android.

La implementación concreta de notificaciones del sistema, permisos y ejecución en segundo plano se definirá en una especificación técnica independiente.

### Compartir notas

El propietario puede compartir una nota escribiendo el correo de otra persona y eligiendo un permiso antes de enviar la invitación.

Permisos iniciales:

| Rol | Leer | Editar contenido | Administrar recordatorio propio | Compartir y cambiar permisos | Eliminar la nota |
| --- | --- | --- | --- | --- | --- |
| Propietario | Sí | Sí | Sí | Sí | Sí |
| Editor | Sí | Sí | Sí | No | No |
| Lector | Sí | No | Sí | No | No |

Reglas:

- El propietario conserva siempre el control de la nota.
- El propietario puede cambiar el permiso de un colaborador o revocar su acceso.
- El invitado debe iniciar sesión con la misma dirección de Google a la que se envió la invitación.
- Una invitación puede permanecer pendiente mientras el correo todavía no tenga una cuenta en Pockira.
- Un lector nunca debe poder modificar el contenido mediante la interfaz ni mediante llamadas directas al backend.
- Un editor puede modificar el contenido, pero no administrar colaboradores ni eliminar la nota.
- Los cambios de acceso deben aplicarse en todas las plataformas y sesiones.

Compartir en el MVP significa acceso autorizado y sincronización del contenido guardado. No incluye todavía cursores de otros usuarios, presencia visual ni edición simultánea basada en CRDT.

## Flujos principales

### Primer acceso

1. El usuario abre Pockira.
2. Selecciona `Continuar con Google`.
3. Completa Google OAuth.
4. Si no tiene notas, se crea o presenta una nota vacía.
5. El cursor queda listo para escribir.

### Apertura habitual

1. El usuario abre Pockira con una sesión válida.
2. La aplicación recupera la última nota abierta por ese usuario.
3. Se muestra primero el contenido disponible localmente cuando sea seguro hacerlo.
4. La aplicación sincroniza silenciosamente la versión remota.
5. El cursor regresa al editor.

### Creación y edición

1. El usuario crea una nota.
2. La nota se abre inmediatamente.
3. Escribe un título o comienza directamente por el contenido.
4. Selecciona texto para abrir el menú contextual de formato.
5. Los cambios se guardan automáticamente.

### Crear un recordatorio

1. El usuario abre una nota.
2. Selecciona la acción de recordatorio.
3. Define fecha y hora.
4. Confirma.
5. La aplicación registra el recordatorio para ese usuario.

### Compartir una nota

1. El propietario abre la acción `Compartir`.
2. Escribe el correo del invitado.
3. Elige `Puede editar` o `Solo lectura`.
4. Confirma la invitación.
5. El invitado accede con la misma cuenta de Google.
6. La nota aparece en su lista de notas compartidas con el permiso concedido.

### Revocar acceso

1. El propietario abre la lista de colaboradores.
2. Selecciona un colaborador.
3. Cambia su permiso o revoca el acceso.
4. El backend aplica el cambio inmediatamente.
5. Las sesiones afectadas dejan de editar o leer según el nuevo permiso.

## Reglas de autorización

La interfaz puede ocultar acciones no permitidas, pero la seguridad no puede depender de la interfaz. InsForge debe aplicar las reglas en la base de datos mediante políticas de acceso por fila.

- Solo el propietario puede eliminar la nota y administrar colaboradores.
- Propietario y editores pueden actualizar el contenido.
- Propietario, editores y lectores autorizados pueden consultar la nota.
- Cada usuario administra únicamente sus recordatorios.
- La revocación elimina tanto la lectura como las suscripciones de sincronización asociadas.

## Modelo funcional inicial

| Entidad | Responsabilidad |
| --- | --- |
| Usuario | Identidad autenticada mediante Google |
| Nota | Título, contenido estructurado, propietario y metadatos |
| Acceso a nota | Relación entre nota, usuario o correo invitado y permiso |
| Recordatorio | Fecha, estado y asociación entre una nota y un usuario |
| Preferencia de usuario | Última nota abierta y configuración personal multiplataforma |

El esquema SQL definitivo, índices, migraciones y políticas se especificarán antes de implementar el backend. El borrador técnico se mantiene en [la especificación del backend](../spec-backend/README.md).

## Backend con InsForge

El alcance previsto utiliza:

- Authentication para Google OAuth y sesiones.
- Postgres para notas, accesos, recordatorios y preferencias.
- Row-Level Security para proteger lectura y escritura según el rol.
- Realtime para propagar cambios guardados y revocaciones de acceso entre sesiones.
- Edge Functions o tareas programadas únicamente si el sistema de recordatorios las necesita.

La colaboración avanzada de Tiptap no se presupone. Si posteriormente se requiere edición simultánea carácter por carácter, deberá evaluarse una solución compatible con CRDT y definir cómo se integra con InsForge.

## Requisitos no funcionales

### Rendimiento percibido

- La pantalla de escritura debe aparecer con la menor cantidad posible de pasos intermedios.
- La escritura y el movimiento del cursor no deben esperar respuestas del backend.
- La lista de notas puede utilizar caché y actualización en segundo plano.
- El editor debe evitar renderizados completos por cada pulsación.

### Accesibilidad

- Todas las acciones del editor deben ser accesibles por teclado.
- El menú contextual debe gestionar foco, etiquetas y estados activos correctamente.
- Los colores deben conservar contraste suficiente y no comunicar información por sí solos.

### Seguridad

- Todas las operaciones privadas requieren una sesión válida.
- Los permisos se verifican en el backend para cada lectura y escritura.
- No se confía en un rol recibido únicamente desde el cliente.
- Las invitaciones se normalizan por correo y no deben revelar cuentas existentes a usuarios no autorizados.

### Portabilidad

- El dominio y las reglas funcionales no deben depender de APIs exclusivas de una plataforma.
- Las integraciones con notificaciones, ciclo de vida y almacenamiento local se aíslan por plataforma.

## Fuera del MVP

- Contraseñas y proveedores de acceso distintos de Google.
- Equipos, organizaciones y espacios de trabajo.
- Bases de datos, tablas y vistas al estilo Notion.
- Comentarios y menciones.
- Enlaces públicos sin autenticación.
- Historial completo de versiones y restauración.
- Archivos adjuntos e imágenes.
- Edición simultánea con cursores y presencia de colaboradores.
- Inteligencia artificial.
- iOS.

## Criterios de éxito del MVP

El MVP está funcionalmente completo cuando una persona puede:

1. Acceder exclusivamente con Google.
2. Crear una nota y continuar escribiendo sin guardar manualmente.
3. Cerrar y volver a abrir la aplicación en la última nota utilizada.
4. Dar formato al contenido mediante un menú contextual de selección.
5. Crear y recibir un recordatorio asociado a una nota.
6. Compartir una nota por correo como editor o lector.
7. Ver los permisos aplicados correctamente desde otra cuenta y otra plataforma.
8. Utilizar las funciones principales en web, escritorio y Android.

## Decisiones pendientes

- Confirmar si el MVP admite un solo recordatorio o varios por nota y usuario.
- Definir el comportamiento exacto cuando dos editores modifican la misma nota al mismo tiempo.
- Definir cuánto contenido estará disponible sin conexión.
- Elegir el mecanismo de notificación para cada plataforma.
- Decidir si la papelera y restauración forman parte del MVP.
- Definir si el color se aplica únicamente al texto o también a la identidad visual de la nota.

## Referencias técnicas

- [Tiptap](https://tiptap.dev/)
- [Tiptap para React](https://tiptap.dev/docs/editor/getting-started/install/react)
- [Tiptap Bubble Menu](https://tiptap.dev/docs/editor/extensions/functionality/bubble-menu)
- [InsForge Authentication](https://docs.insforge.dev/core-concepts/authentication/overview)
- [InsForge Database](https://docs.insforge.dev/core-concepts/database/overview)
- [InsForge Realtime](https://docs.insforge.dev/core-concepts/realtime/overview)
