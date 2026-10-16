# Web pública de Pockira

La página de presentación vive en `website/`. Es HTML, CSS y JavaScript estático, independiente del frontend de la aplicación: no requiere claves de InsForge, dependencias de Tauri ni un proceso de compilación.

## Vista previa

Desde la raíz del repositorio:

```sh
bun x vite website --host 127.0.0.1 --port 4173
```

## Publicación en Cloudflare Pages

Proyecto creado: `pockira`. Host asignado: `pockira.pages.dev`.

Publicar con Wrangler desde la raíz del repositorio (la primera vez, `bunx wrangler login`):

```sh
bunx wrangler pages deploy website --project-name pockira --branch main
```

`main` es la rama de producción: el deployment actualiza `pockira.pages.dev` y `pockira.lat`. Wrangler muestra un aviso sobre la carpeta `functions/` de la raíz (funciones de InsForge, sin rutas de Pages) y la omite. No hay despliegue automático desde GitHub. Alternativa manual: Direct Upload del contenido de `website/` con `index.html` en la raíz. La fuente Nunito Sans se sirve localmente e incluye su licencia.

## Dominio y correo

Objetivo: conectar `pockira.lat` mediante Custom domains en Pages. Aún pendiente. La conexión del dominio raíz requiere una zona de Cloudflare y sus nameservers. Antes de cambiar los nameservers de Spaceship, preparar la continuidad del correo: `founder@pockira.lat` ya reenvía al Gmail del propietario mediante Spaceship. No asumir que ese servicio seguirá funcionando al cambiar los nameservers. Configurar y verificar Email Routing en Cloudflare si se migra el DNS; probar un correo externo después del cambio. Conservar cualquier registro DNS necesario.

La renovación automática del dominio está desactivada por decisión del propietario.

## Contenido y descargas

Los enlaces de descarga apuntan a archivos verificados de la release pública `v0.4.2` en `MarioSC21/pockira`: Windows x64, macOS Apple Silicon/Intel, Linux x64 y el APK de Android arm64 (generado por `android.yml`). Al cambiar de versión, actualizar enlaces y etiqueta de versión juntos.

La nota del hero es una demostración visual, no una sesión de la app. Sus temas y casillas son interactivos, pero no guardan contenido. No se ofrecen funciones de IA como disponibles ni se anuncian beneficios de Claude como ya aprobados.

## Verificación realizada

- `bun x ultracite check website/index.html website/styles.css website/preview.js`
- Inspección visual de escritorio y móvil (390 px), sin desbordamiento horizontal.
- Cambio de tema de la nota de ejemplo.
- Enlaces de instaladores contrastados con la API pública de GitHub Releases.

Falta verificar el deployment público, el dominio personalizado y el correo tras configurar DNS.
