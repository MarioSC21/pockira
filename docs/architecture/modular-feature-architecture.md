# Arquitectura modular por features

Este documento define la arquitectura del frontend. La estructura utiliza módulos por features y sigue el principio de Screaming Architecture: las carpetas deben comunicar las capacidades reales del producto, no solamente las tecnologías utilizadas.

Esta guía es reutilizable entre proyectos frontend. Se aplica al código dentro de `src` y no presupone un producto, dominio, backend o plataforma específicos.

## Objetivos

- Mantener cada módulo funcional autocontenido y con una responsabilidad clara.
- Permitir que la estructura evolucione según las capacidades reales del producto.
- Evitar que los cambios de un módulo afecten innecesariamente a otros.
- Mantener las rutas separadas de la implementación de las pantallas.
- Exponer APIs públicas pequeñas y evitar dependencias con archivos internos.
- Compartir únicamente código genérico y estable.
- Crear carpetas cuando exista una necesidad real, no por anticipado.

## Estructura principal

```text
src/
  app/
  routes/
  modules/
  shared/
  router.tsx
  routeTree.gen.ts
```

No existe una carpeta `pages`. TanStack Router representa las rutas mediante archivos dentro de `routes`, mientras que la implementación completa de cada pantalla pertenece a su módulo.

## Carpetas principales

### `app`

Contiene el inicio y la configuración global de la aplicación:

- punto de entrada
- composición de proveedores globales
- estilos globales
- configuración global del estado
- límites globales de errores

No debe contener lógica específica de un módulo funcional.

### `routes`

Contiene las definiciones de rutas basadas en archivos de TanStack Router. Su estructura representa las URL y sus relaciones de anidamiento.

Una ruta puede encargarse de:

- declarar la URL con `createFileRoute`
- validar parámetros de ruta o de búsqueda
- ejecutar loaders y guards relacionados con la navegación
- definir estados de carga, error o no encontrado
- conectar la ruta con la pantalla pública de un módulo

Una ruta no debe implementar servicios ni lógica de negocio. Funciona como adaptador de TanStack Router y como punto de composición de la página: puede renderizar una pantalla completa o combinar layouts y secciones públicas de uno o varios módulos.

```tsx
import { createFileRoute } from "@tanstack/react-router"

import { NotesScreen } from "@/modules/notes"

export const Route = createFileRoute("/notes")({
  component: NotesScreen,
})
```

`routeTree.gen.ts` es generado por TanStack Router y no debe editarse manualmente.

### `modules`

Contiene las capacidades funcionales del producto. Cada módulo reúne la pantalla, los componentes, el estado, los casos de uso, las validaciones y la integración con servicios externos que necesita esa capacidad.

Los módulos no están definidos de antemano. Cada proyecto crea los que necesita según sus propias funcionalidades. Los siguientes nombres son únicamente ejemplos y no forman parte obligatoria de la arquitectura:

```text
modules/
  notes/
  calendar/
  authentication/
  payments/
```

Si se necesita una pantalla de notas, se crea `modules/notes`. La pantalla, sus componentes y todo su comportamiento permanecen dentro de ese módulo.

Evita nombres técnicos como `forms`, `components`, `hooks` o `services` en el primer nivel de `modules`. Los nombres de módulos deben describir capacidades reconocibles del producto.

### `shared`

Contiene código genérico que puede utilizarse en cualquier módulo y que no expresa reglas de negocio específicas.

Ejemplos válidos:

- botones, diálogos e inputs genéricos
- clientes base para APIs, almacenamiento o integraciones externas
- providers técnicos reutilizables
- utilidades para fechas, texto o moneda
- hooks independientes del negocio
- configuración del entorno
- tipos técnicos compartidos

No muevas código a `shared` solamente porque se usa dos veces. Si pertenece conceptualmente a un módulo, debe permanecer allí y exponerse mediante su API pública cuando sea necesario.

### Providers globales

Las definiciones de providers técnicos se centralizan en `shared/providers`. El punto de entrada y la ruta raíz solamente deciden en qué orden se montan.

```text
shared/
  providers/
    provider.tsx
```

- `provider.tsx` exporta un único `AppProvider` que monta todos los providers globales y el `RouterProvider` de la aplicación.
- Los providers que necesitan el contexto del router, como `NuqsAdapter`, se entregan mediante la opción `InnerWrap` de `RouterProvider`.
- Los providers específicos de una feature permanecen dentro de `modules/<feature>/context` o de la carpeta privada correspondiente.
- No acumules configuración funcional de módulos dentro de providers globales.

El orden de renderizado es:

```text
StrictMode
  AppProvider
    QueryClientProvider
      RouterProvider
        NuqsAdapter (InnerWrap)
          __root
            Outlet
```

`QueryClient` se crea una sola vez en `shared/lib/query-client.ts`, se entrega a `QueryClientProvider` y también al contexto tipado de TanStack Router. De esta forma, los loaders pueden utilizar `context.queryClient` y los componentes pueden utilizar hooks de TanStack Query sobre la misma caché.

El adaptador de nuqs para TanStack Router debe ejecutarse dentro de `RouterProvider`, no envolverlo desde fuera, porque utiliza el contexto del router. `AppProvider` lo configura mediante `InnerWrap`. Los parsers de nuqs pueden integrarse con `validateSearch` mediante `createStandardSchemaV1` cuando una ruta necesite conservar enlaces y navegación tipados.

## Sistema de componentes compartidos

Los componentes compartidos se separan entre primitivas del design system y composiciones reutilizables con un propósito concreto:

```text
shared/
  components/
    ui/
      button.tsx
      dialog.tsx
      input.tsx
    custom-components/
      feedback/
        router-feedback.tsx
      layout/
        app-shell.tsx
      navigation/
        app-navigation.tsx
```

### `components/ui`: primitivas del design system

`shared/components/ui` contiene primitivas visuales provenientes de shadcn, Base UI u otra librería y adaptadas al design system del proyecto. Estas primitivas definen de forma centralizada colores, tamaños, radios, tipografía, estados y accesibilidad.

Cuando una pantalla utiliza una primitiva, debe consumir su contrato público. No debe rediseñarla con clases visuales arbitrarias.

La regla aplica a todas las primitivas de `shared/components/ui`, no solamente a `Button`. Los ejemplos con botones representan el mismo criterio para `Input`, `Textarea`, `Select`, `Dialog`, `Card`, `Tabs`, `Badge`, `Table` y cualquier componente futuro del design system.

```tsx
// Incorrecto: crea una variante visual no controlada por el design system.
<Button className="rounded-full bg-red-500 px-8">Eliminar</Button>

// Correcto: consume variantes definidas por el design system.
<Button size="lg" variant="destructive">
  Eliminar
</Button>

// Correcto: adapta el componente al layout sin rediseñarlo.
<Button className="w-full" variant="destructive">
  Eliminar
</Button>
```

Si se necesita un nuevo color, tamaño o estado reutilizable, agrégalo como una variante tipada de la primitiva, por ejemplo mediante CVA. No repitas combinaciones de clases en cada pantalla.

`className` puede controlar cómo una instancia participa en el layout sin cambiar su identidad visual. Son usos válidos clases como `w-full`, `self-end`, `grow`, `shrink-0` o márgenes contextuales. Siempre que sea posible, el contenedor debe controlar la distribución.

No utilices `className` para reemplazar decisiones visuales del design system como fondo, color de texto, borde, radio, sombra, tipografía, altura interna o estados `hover` y `focus`. Si una necesidad visual se repite o forma parte del producto, conviértela en una variante tipada.

Una sobrescritura visual directa se acepta únicamente como salida de emergencia temporal. Debe quedar localizada, explicar por qué la variante existente no sirve y convertirse en una variante o componente compuesto si permanece o vuelve a utilizarse.

```text
Permitido:  w-full, grow, self-end, mt-4
Variante:   color, size, radius, emphasis, loading
Evitar:     bg-red-500, text-white, rounded-full, shadow-xl, hover:bg-red-600
```

Ejemplos equivalentes con otras primitivas:

```tsx
// Correcto: el input ocupa el ancho disponible del layout.
<Input className="w-full" />

// Correcto: el componente usa una variante pública del design system.
<Badge variant="destructive">Error</Badge>

// Incorrecto: la instancia redefine visualmente la primitiva.
<Input className="rounded-none border-red-500 bg-yellow-100" />

// Incorrecto: crea una apariencia de diálogo fuera del contrato público.
<DialogContent className="rounded-none bg-black text-white shadow-2xl" />
```

La pregunta no es qué componente se está utilizando, sino qué clase de cambio se está realizando: el consumidor puede adaptar el layout; el design system controla la apariencia visual de todas sus primitivas.

No modifiques una primitiva de shadcn por una necesidad exclusiva de una pantalla. Una modificación en `ui` representa una decisión global del design system y debe beneficiar a todos sus consumidores.

### Componentes compuestos y personalizados

Un componente que combina primitivas o añade comportamiento específico no pertenece automáticamente a `ui`. Debe ubicarse según su alcance y propósito:

- si solo pertenece a una feature, colócalo en `modules/<feature>/components`;
- si es reutilizable entre módulos, colócalo en `shared/components/custom-components`;
- dentro de `custom-components`, utiliza categorías semánticas que comuniquen la responsabilidad de cada archivo.

Ejemplos de categorías compartidas:

| Carpeta | Propósito |
| --- | --- |
| `custom-components/feedback` | Estados de carga, error, vacío, éxito o progreso |
| `custom-components/layout` | Estructuras visuales reutilizables y shells |
| `custom-components/navigation` | Navegación, breadcrumbs y controles de rutas |
| `custom-components/forms` | Composiciones de formularios que combinan primitivas |
| `custom-components/data-display` | Tablas, listas y visualización compuesta de datos |

Un botón de búsqueda especializado puede componerse sobre la primitiva sin alterar el botón global:

```tsx
import { Search } from "lucide-react"

import { Button } from "@/shared/components/ui/button"

interface SearchButtonProps {
  onSearch: () => void
}

export function SearchButton({ onSearch }: SearchButtonProps) {
  return (
    <Button onClick={onSearch} variant="outline">
      <Search aria-hidden="true" />
      Buscar
    </Button>
  )
}
```

Si `SearchButton` solo existe para notas, debe vivir en `modules/notes/components`. Si representa una acción genérica utilizada por varios módulos, puede vivir en una categoría semántica de `shared/components/custom-components`.

`router-feedback.tsx` es un ejemplo de componente compuesto compartido: vive en `shared/components/custom-components/feedback`, representa estados de navegación y utiliza las primitivas de `shared/components/ui` para sus acciones.

### Regla de dependencias visuales

```text
pantallas y componentes de módulos
        ↓
componentes compuestos compartidos (`shared/components/custom-components`)
        ↓
primitivas del design system (`shared/components/ui`)
        ↓
shadcn, Base UI u otras librerías
```

Los niveles inferiores no deben importar componentes de los niveles superiores. Los módulos pueden componer primitivas directamente cuando no necesitan una abstracción adicional.

## Estructura interna de un módulo

Cada módulo puede utilizar las siguientes carpetas:

```text
modules/
  notes/
    screens/
      notes-screen.tsx
    components/
    hooks/
    service/
      api.ts
      keys.ts
      queries.ts
      mutations.ts
    actions/
    context/
    schemas/
    types/
    lib/
    layouts/
    index.ts
```

| Carpeta o archivo | Responsabilidad |
| --- | --- |
| `screens` | Composición completa de las pantallas públicas del módulo |
| `components` | Componentes visuales exclusivos del módulo |
| `hooks` | Hooks de React que coordinan el comportamiento del módulo |
| `service` | Acceso remoto del módulo y configuración de TanStack Query |
| `actions` | Casos de uso y operaciones que puede realizar el usuario |
| `context` | Contextos y proveedores locales del módulo |
| `schemas` | Esquemas de validación y transformación de datos |
| `types` | Tipos internos del módulo |
| `lib` | Utilidades privadas y específicas del módulo |
| `layouts` | Estructuras persistentes que envuelven varias pantallas del módulo |
| `index.ts` | API pública del módulo |

Estas carpetas son opcionales. Crea únicamente las que tengan una responsabilidad real. Un módulo pequeño puede comenzar así:

```text
modules/
  notes/
    screens/
      notes-screen.tsx
    components/
      notes-list.tsx
    service/
      api.ts
      keys.ts
      queries.ts
    index.ts
```

No crees carpetas vacías como marcadores de posición.

## Rutas, pantallas, secciones, layouts y componentes

### La ruta arma la página

El componente de una ruta es el punto donde se decide qué aparece en esa URL. Puede combinar un layout, una pantalla completa y secciones públicas de módulos. También conecta loaders, params, search params y navegación tipada con las props que necesitan esas piezas.

Una landing suele componerse directamente desde su ruta:

```text
modules/
  landing/
    components/
      hero-section.tsx
      pricing-section.tsx
      site-footer.tsx
    index.ts

routes/
  index.tsx
```

```tsx
import { createFileRoute } from "@tanstack/react-router"

import { HeroSection, PricingSection, SiteFooter } from "@/modules/landing"

export const Route = createFileRoute("/")({
  component: LandingRoute,
})

function LandingRoute() {
  return (
    <>
      <HeroSection />
      <PricingSection />
      <SiteFooter />
    </>
  )
}
```

No es necesario crear `LandingScreen` únicamente para envolver esas tres piezas. La ruta ya expresa claramente cómo se arma la página.

La ruta puede contener markup pequeño que solo tenga sentido allí. Extrae una pieza cuando el archivo deje de ser fácil de leer, la sección tenga responsabilidad propia, incluya comportamiento o se reutilice. Aunque componga la página, la ruta no debe implementar reglas de negocio, clientes externos ni detalles de servicios.

### `screens`: una vista completa y opcional

Un screen representa una vista funcional completa, no una sección. Vive en `modules/<feature>/screens` cuando resulta útil encapsular toda la interfaz de una ruta dentro de un solo módulo.

Ejemplos válidos son `NotesScreen`, `NoteDetailsScreen` o `SettingsScreen`. La ruta puede renderizar un screen y pasarle los datos obtenidos por su loader:

```tsx
function NoteDetailsRoute() {
  const note = Route.useLoaderData()

  return <NoteDetailsScreen note={note} />
}
```

No todas las rutas necesitan un screen. Úsalo cuando la vista completa tenga cohesión, comportamiento y suficiente contenido para justificar esa frontera. Si la ruta compone varias secciones independientes, puede armarlas directamente sin crear un screen artificial.

### Secciones de una página

Una sección no es un screen. Nómbrala por su responsabilidad, por ejemplo `hero-section.tsx`, `pricing-section.tsx` o `router-capabilities-section.tsx`, y mantenla en `components` dentro del módulo propietario.

La ruta decide el orden de las secciones. Cada sección controla únicamente su contenido y comportamiento local. Una pantalla o componente de módulo puede utilizar `Link` de TanStack Router y declarar `to`, `params` y `search` cuando la navegación forma parte de su propia interfaz.

Prefiere `Link` para navegación declarativa porque conserva la semántica de enlace, la apertura en otra pestaña, el preloading y el tipado. Utiliza `navigate` para navegación imperativa después de una acción o para actualizar search params desde controles como filtros y paginación.

El módulo puede conocer destinos públicos, pero no debe importar archivos ni objetos `Route` desde `src/routes`.

### `layouts`: estructura persistente entre pantallas

Un layout no es cualquier componente grande ni cualquier elemento `<header>`. Es una estructura visual que permanece mientras cambian varias pantallas o rutas hijas, por ejemplo un shell autenticado con sidebar, navegación y un área donde se renderiza el contenido activo.

- Si el layout pertenece a un único módulo, vive en `modules/<feature>/layouts`.
- Si es verdaderamente genérico y compartido por varios módulos, vive en `shared/components/custom-components/layout`.
- Si participa en la jerarquía de URL, una ruta layout de TanStack Router lo conecta con `<Outlet />`.

Una landing puede combinar `<header>`, varias `<section>` y `<footer>` desde su ruta; eso no la convierte automáticamente en un layout. Solo extrae un `LandingLayout` cuando esa estructura envuelva o se reutilice entre varias páginas.

### `components`: piezas internas de una pantalla

No extraigas componentes únicamente para reducir líneas. Un título usado una sola vez debe permanecer como `<h1>` dentro de la pantalla; no crees un `TitleH1` sin un contrato visual o funcional reutilizable.

Extrae un componente cuando se cumpla al menos una condición:

- representa una sección significativa con responsabilidad propia;
- contiene comportamiento o estado aislable;
- se repite dentro del módulo;
- necesita pruebas independientes;
- forma parte del design system o de una composición compartida estable.

Por ejemplo, una landing pequeña puede escribirse directamente en su ruta. Si crece, puede extraer `pricing-section.tsx` o `testimonials-section.tsx` dentro del mismo módulo, y la ruta mantiene el orden que forma la página completa.

## API pública de los módulos

Cada módulo expone lo necesario mediante su archivo `index.ts`. Las rutas y el resto de la aplicación deben importar desde esa API pública.

```ts
// Correcto
import { NotesScreen, useNotes } from "../modules/notes"

// Incorrecto: accede a la estructura interna
import { NotesScreen } from "../modules/notes/screens/notes-screen"
```

El `index.ts` de cada módulo es una frontera arquitectónica intencional. No crees un archivo de barril global que reexporte todos los módulos.

## Reglas de dependencias

El flujo principal de dependencias es:

```text
app → router → routes → modules → shared
```

- `app` puede configurar el router, proveedores globales y elementos de `shared`.
- `routes` puede importar las APIs públicas de `modules` y elementos de `shared`.
- Un módulo puede importar desde `shared`.
- `shared` no puede importar desde `modules`, `routes` ni `app`.
- Un módulo no debe acceder a archivos internos de otro módulo.
- La coordinación entre varios módulos debe realizarse en una ruta, en `app` o mediante contratos públicos explícitos.
- Los módulos pueden utilizar `Link` y destinos públicos tipados, pero no pueden importar archivos internos ni objetos `Route` desde `routes`.

## Integraciones externas

Las APIs, SDK, bases de datos, almacenamiento local y capacidades nativas deben mantenerse detrás de fronteras claras:

- Mantén los clientes base y genéricos en `shared/service`.
- Mantén las operaciones específicas de una funcionalidad en `service` dentro del módulo propietario.
- No accedas directamente a clientes o SDK externos desde componentes, rutas o contextos.
- Los componentes deben ejecutar actions o utilizar hooks del módulo.
- Evita que la lógica funcional dependa de la implementación concreta de una integración externa.

Flujo recomendado:

```text
ruta → pantalla del módulo → componente → hook o action
     → service del módulo → cliente compartido → sistema externo
```

## Datos remotos con TanStack Query

Cuando un módulo utiliza TanStack Query, su integración remota se centraliza en una carpeta `service` con hasta cuatro archivos convencionales:

```text
modules/
  workflows/
    service/
      api.ts
      keys.ts
      queries.ts
      mutations.ts
```

| Archivo | Responsabilidad |
| --- | --- |
| `api.ts` | Funciones asíncronas tipadas que llaman a `fetch`, comandos de Tauri, SDK o cliente compartido |
| `keys.ts` | Factory central de query keys del módulo |
| `queries.ts` | Factories de `queryOptions` y hooks de lectura basados en esas mismas opciones |
| `mutations.ts` | `mutationOptions` o hooks de escritura, invalidación y actualización de caché |

Los cuatro archivos no son obligatorios. Un módulo que solo accede a almacenamiento local puede necesitar únicamente `api.ts`. No crees archivos vacíos.

### `api.ts`: transporte sin React Query

`api.ts` contiene las operaciones remotas del módulo. Sus funciones no importan hooks, no administran caché y no muestran interfaz. Deben poder utilizarse desde Query, loaders, actions y pruebas.

```ts
import type { Workflow, WorkflowInput } from "../types/workflow"

export async function fetchWorkflows(): Promise<Workflow[]> {
  const response = await fetch("/api/workflows")

  if (!response.ok) {
    throw new Error("No se pudieron cargar los workflows")
  }

  return response.json() as Promise<Workflow[]>
}

export async function createWorkflow(input: WorkflowInput): Promise<Workflow> {
  const response = await fetch("/api/workflows", {
    body: JSON.stringify(input),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  })

  if (!response.ok) {
    throw new Error("No se pudo crear el workflow")
  }

  return response.json() as Promise<Workflow>
}
```

Si varios módulos utilizan la misma configuración HTTP, autenticación o serialización, extrae ese cliente técnico a `shared/service`. Los endpoints y tipos propios del dominio permanecen en el módulo.

### `keys.ts`: query keys centralizadas

Cada dato que pueda cambiar el resultado debe aparecer en la query key. Se recomienda una factory jerárquica para poder invalidar todo el módulo, todas las listas o un detalle concreto.

```ts
import type { WorkflowFilters } from "../types/workflow"

export const workflowKeys = {
  all: ["workflows"] as const,
  details: () => [...workflowKeys.all, "detail"] as const,
  detail: (id: string, version?: string) =>
    [...workflowKeys.details(), id, version ?? null] as const,
  lists: () => [...workflowKeys.all, "list"] as const,
  list: (filters: WorkflowFilters) =>
    [...workflowKeys.lists(), filters] as const,
}
```

No escribas arrays como `["workflows"]` repetidos en rutas, componentes o mutations. Todos deben consumir `workflowKeys` o las opciones exportadas por `queries.ts`.

### `queries.ts`: opciones reutilizables y hooks

La unidad principal es una factory creada con `queryOptions`. La misma factory debe funcionar en TanStack Router, componentes, prefetch manual y pruebas.

```ts
import { queryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query"

import { fetchWorkflowDetail, fetchWorkflows } from "./api"
import { workflowKeys } from "./keys"

export const workflowsQueryOptions = () =>
  queryOptions({
    queryFn: fetchWorkflows,
    queryKey: workflowKeys.lists(),
  })

export const workflowDetailQueryOptions = (id: string, version?: string) =>
  queryOptions({
    queryFn: () => fetchWorkflowDetail(id, version),
    queryKey: workflowKeys.detail(id, version),
  })

export const useWorkflows = () => useQuery(workflowsQueryOptions())

export const useWorkflowDetail = (id: string, version?: string) =>
  useSuspenseQuery(workflowDetailQueryOptions(id, version))
```

No combines un parámetro opcional con una excepción inmediata y `enabled: false`. Elige una de estas estrategias:

- si la consulta exige el identificador, recibe `id: string`;
- si la consulta es realmente condicional, utiliza `enabled` o `skipToken` sin lanzar durante el render.

### Compatibilidad con loaders de TanStack Router

La ruta importa las opciones públicas del módulo y las entrega al `QueryClient`. No llama un hook ni reproduce la query key.

```tsx
import { createFileRoute } from "@tanstack/react-router"

import { WorkflowScreen, workflowDetailQueryOptions } from "@/modules/workflows"

export const Route = createFileRoute("/workflows/$workflowId")({
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData(
      workflowDetailQueryOptions(params.workflowId)
    ),
  component: WorkflowRoute,
})

function WorkflowRoute() {
  const { workflowId } = Route.useParams()

  return <WorkflowScreen workflowId={workflowId} />
}
```

El componente lee y observa la misma entrada de caché:

```tsx
import { useSuspenseQuery } from "@tanstack/react-query"

import { workflowDetailQueryOptions } from "./service/queries"

export function WorkflowScreen({ workflowId }: { workflowId: string }) {
  const { data } = useSuspenseQuery(workflowDetailQueryOptions(workflowId))

  return <h1>{data.name}</h1>
}
```

Para datos críticos utiliza `ensureQueryData` y espera el loader. Para datos secundarios que deben cargar después de mostrar la estructura estática, inicia `prefetchQuery` sin bloquear y utiliza `useQuery` en la sección correspondiente.

### `mutations.ts`: escrituras e invalidación

Las mutations llaman funciones de `api.ts` e invalidan mediante las keys centralizadas. Pueden exponer hooks cuando se consumen desde React.

```ts
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { createWorkflow, deleteWorkflow } from "./api"
import { workflowKeys } from "./keys"

export function useCreateWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkflow,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.lists(),
      })
    },
  })
}

export function useDeleteWorkflow() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWorkflow,
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: workflowKeys.all,
      })
    },
  })
}
```

Las notificaciones visuales son una decisión de experiencia de usuario. Pueden configurarse en el hook cuando siempre forman parte de la operación, o en el componente consumidor cuando dependen de la pantalla. No analices errores remotos como `any`; normalízalos en `api.ts` y expón errores tipados.

### Flujo completo

```text
ruta ──ensureQueryData──┐
                       ├── queryOptions ── query key ── api.ts ── sistema externo
componente ──useQuery───┘

componente ──useMutation── mutations.ts ── api.ts
                              └── invalidateQueries(workflowKeys)
```

Esta convención evita duplicar la configuración entre TanStack Router y TanStack Query, mantiene el transporte independiente de React y conserva toda la integración del dominio dentro de su módulo propietario.

## Ejemplo: módulo de notas

Este ejemplo ilustra una posible estructura; no declara que el proyecto deba incluir un módulo de notas.

```text
modules/
  notes/
    screens/
      note-details-screen.tsx
      notes-screen.tsx
    components/
      note-editor.tsx
      notes-list.tsx
    hooks/
      use-notes.ts
    actions/
      create-note.ts
      delete-note.ts
    service/
      api.ts
      keys.ts
      queries.ts
      mutations.ts
    context/
      notes-provider.tsx
    schemas/
      note-schema.ts
    types/
      note.ts
    lib/
      sort-notes.ts
    index.ts
```

La ruta correspondiente permanece pequeña:

```text
routes/
  notes.tsx
```

No todos los elementos del ejemplo tienen que existir desde el comienzo. Solo muestran dónde debe ubicarse cada responsabilidad cuando sea necesaria.

## Decidir dónde colocar el código

Antes de crear o mover un archivo, sigue estas preguntas:

1. ¿Representa una capacidad o pantalla funcional del producto? Crea o utiliza `modules/<nombre>`.
2. ¿Define una URL, loader, guard o esquema de navegación? Colócalo en `routes`. Referenciar un destino público mediante `Link` sí está permitido desde un módulo.
3. ¿Configura o inicia toda la aplicación? Colócalo en `app`.
4. ¿Es realmente genérico e independiente de cualquier módulo? Colócalo en `shared`.
5. ¿Solo lo utiliza un módulo? Mantenlo privado dentro de ese módulo.
6. ¿Otro consumidor necesita utilizarlo? Expón la superficie mínima desde el `index.ts` del módulo.

## Convenciones

- Nombra los módulos según capacidades reconocibles del producto.
- Mantén la pantalla y su comportamiento dentro del mismo módulo.
- Mantén delgados los archivos de rutas.
- Mantén los archivos cerca del código que los utiliza.
- Prefiere módulos cohesionados frente a carpetas globales organizadas por tecnología.
- Evita archivos globales como `utils.ts`, `helpers.ts` o `types.ts` que acumulen responsabilidades no relacionadas.
- Mantén pequeñas las APIs públicas.
- Evita dependencias circulares entre módulos.
- Migra el código inicial de forma incremental cuando sea modificado.
- No reorganices todo el proyecto únicamente para crear carpetas vacías.

## Referencias

- [Guía reproducible del stack frontend](../setup/frontend-stack.md)
- [TanStack Router: rutas basadas en archivos](https://tanstack.com/router/latest/docs/routing/file-based-routing)
- [TanStack Router: creación del router](https://tanstack.com/router/latest/docs/framework/react/guide/creating-a-router)
- [TanStack Router: carga de datos externa](https://tanstack.com/router/latest/docs/guide/external-data-loading)
- [TanStack Query: query options](https://tanstack.com/query/latest/docs/framework/react/guides/query-options)
- [TanStack Query: mutations](https://tanstack.com/query/latest/docs/framework/react/guides/mutations)
- [nuqs: adaptador para TanStack Router](https://nuqs.dev/docs/adapters#tanstack-router)
