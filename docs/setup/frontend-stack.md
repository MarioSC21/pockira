# Guía reproducible del stack frontend

Esta guía describe cómo recrear en otro proyecto el stack técnico usado por esta aplicación. Las decisiones sobre límites, módulos y dependencias internas permanecen en la [arquitectura modular por features](../architecture/modular-feature-architecture.md).

## Fuentes de verdad

- `package.json` declara las librerías y los scripts disponibles.
- `bun.lock` fija las versiones transitivas para instalaciones idénticas.
- Esta guía explica para qué se utiliza cada grupo y qué configuración debe reproducirse.

Para clonar exactamente un proyecto existente, copia ambos archivos y ejecuta:

```bash
bun install --frozen-lockfile
```

En un proyecto nuevo pueden instalarse versiones actuales con los comandos siguientes y conservar el nuevo `bun.lock` generado.

## Skills del agente

Estas skills son documentación operativa para el agente y no forman parte del bundle de la aplicación:

```bash
npx skills add https://github.com/tanstack-skills/tanstack-skills --skill tanstack-router
npx skills add https://github.com/tanstack-skills/tanstack-skills --skill tanstack-query
npx skills add https://github.com/cathrynlavery/diagram-design --skill diagram-design
```

Se instalan localmente en `.agents/skills` para que acompañen al proyecto. Las skills de TanStack orientan el trabajo con Router y Query; `diagram-design` define el proceso para crear y revisar diagramas técnicos, modelos entidad-relación y visualizaciones de arquitectura.

## Base del proyecto

Requisitos:

- Bun como gestor de paquetes y ejecutor de scripts.
- React con TypeScript y Vite.
- Rust y los requisitos de plataforma de Tauri solamente cuando el proyecto sea de escritorio o móvil.

TanStack Router puede generar una base independiente del framework de servidor:

```bash
bunx @tanstack/cli create --router-only
```

La aplicación resultante continúa siendo una SPA aunque utilice TanStack Query. Tauri carga esa SPA dentro de su WebView para escritorio, Android e iOS.

## Dependencias

### Rutas, datos y validación

```bash
bun add @tanstack/react-router @tanstack/react-query nuqs zod
bun add -D @tanstack/router-plugin @tanstack/router-cli
bun add -D @tanstack/react-router-devtools @tanstack/react-query-devtools
```

- TanStack Router aporta rutas tipadas, loaders, preloading, boundaries y code splitting.
- TanStack Query administra caché, queries, mutations y sincronización de datos remotos.
- nuqs administra estado compartible en los search params de la URL.
- Zod valida datos externos, formularios y parámetros cuando se necesita un esquema de dominio.

### Interfaz y estilos

```bash
bun add @base-ui/react @fontsource-variable/geist @fontsource-variable/outfit
bun add @tailwindcss/vite tailwindcss tw-animate-css
bun add class-variance-authority clsx lucide-react sileo tailwind-merge shadcn
```

Las primitivas generadas o adaptadas al design system viven en `src/shared/components/ui`. Las composiciones reutilizables viven en `src/shared/components/custom-components`.

Sileo muestra notificaciones globales mediante un único `<Toaster position="top-right" />` dentro de `AppProvider`.

### Tauri

```bash
bun add @tauri-apps/api @tauri-apps/plugin-opener
bun add -D @tauri-apps/cli
```

Los destinos móviles se inicializan una vez:

```bash
bun run init:android
bun run init:ios
```

### Calidad de código

```bash
bun add -D ultracite oxlint oxfmt
```

Las reglas particulares del proyecto se conservan en `oxlint.config.ts`. La guía completa está en [Ultracite Code Standards](../linting/ultracite.md).

## Configuración imprescindible

### Alias absoluto

`tsconfig.json` debe resolver `@/*` desde `src`:

```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

Vite debe activar la resolución de paths del `tsconfig`:

```ts
resolve: {
  tsconfigPaths: true,
}
```

### TanStack Router y code splitting

El plugin del router debe ejecutarse antes del plugin de React:

```ts
plugins: [tanstackRouter({ autoCodeSplitting: true }), react(), tailwindcss()]
```

El script de build genera el árbol antes de comprobar TypeScript:

```json
{
  "build": "tsr generate && tsc && vite build",
  "routes:generate": "tsr generate"
}
```

`src/routeTree.gen.ts` es generado y nunca debe editarse manualmente.

### React Query, Router y nuqs

Se crea un único `QueryClient` en `src/shared/lib/query-client.ts`. La misma instancia se entrega al contexto del router y a `QueryClientProvider`.

Todos los providers globales se componen en `src/shared/providers/provider.tsx`:

```tsx
export function AppProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <Toaster position="top-right" />
      <RouterProvider InnerWrap={NuqsAdapter} router={router} />
    </QueryClientProvider>
  )
}
```

`InnerWrap` coloca `NuqsAdapter` dentro del contexto de TanStack Router. En `main.tsx` solamente se renderiza:

```tsx
<StrictMode>
  <AppProvider />
</StrictMode>
```

El router recibe `queryClient` mediante un contexto tipado y utiliza `defaultPreloadStaleTime: 0`; así TanStack Query decide la vigencia de los datos precargados.

### shadcn

`components.json` debe dirigir cada tipo de archivo a la arquitectura compartida:

```json
{
  "aliases": {
    "components": "@/shared/components/custom-components",
    "hooks": "@/shared/hooks",
    "lib": "@/shared/lib",
    "ui": "@/shared/components/ui",
    "utils": "@/shared/lib/utils"
  }
}
```

## Estructura mínima

```text
src/
  app/
    styles/
  modules/
    <feature>/
      screens/
      components/
      service/
        api.ts
        keys.ts
        mutations.ts
        queries.ts
  routes/
    __root.tsx
  shared/
    components/
      custom-components/
      ui/
    hooks/
    lib/
      query-client.ts
    providers/
      provider.tsx
    types/
      router-context.ts
  main.tsx
  router.tsx
```

Las carpetas internas de cada feature se crean únicamente cuando son necesarias. Consulta la guía de arquitectura para conocer las responsabilidades y reglas de importación.

## Scripts recomendados

```json
{
  "build": "tsr generate && tsc && vite build",
  "check": "ultracite check",
  "dev": "vite",
  "dev:android": "tauri android dev",
  "dev:desktop": "tauri dev",
  "dev:ios": "tauri ios dev",
  "fix": "ultracite fix",
  "init:android": "tauri android init",
  "init:ios": "tauri ios init",
  "routes:generate": "tsr generate"
}
```

## Verificación final

Después de reproducir la configuración:

```bash
bun run routes:generate
bun run check
bun run build
```

La configuración está completa cuando se genera el árbol de rutas, TypeScript compila, Ultracite no informa errores y Vite produce el build de producción.
