"use client"

import {
  ChevronRightIcon,
  Code2,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrdered,
  PilcrowIcon,
  Quote,
  SeparatorHorizontalIcon,
  Square,
  Table,
} from "lucide-react"
import { KEYS } from "platejs"
import type { TComboboxInputElement } from "platejs"
import type { PlateEditor, PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"
import * as React from "react"

import { useStatuses } from "@/shared/components/custom-components/editor/status-store"
import {
  insertBlock,
  insertStatus,
} from "@/shared/components/custom-components/editor/transforms"

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "./inline-combobox"
import { StatusPill } from "./status-node"

interface Group {
  group: string
  items: {
    icon: React.ReactNode
    value: string
    onSelect: (editor: PlateEditor, value: string) => void
    keywords?: string[]
    label?: string
  }[]
}

const groups: Group[] = [
  {
    group: "Bloques",
    items: [
      {
        icon: <PilcrowIcon />,
        keywords: ["paragraph", "texto"],
        label: "Texto",
        value: KEYS.p,
      },
      {
        icon: <Heading1Icon />,
        keywords: ["titulo", "h1"],
        label: "Título 1",
        value: KEYS.h1,
      },
      {
        icon: <Heading2Icon />,
        keywords: ["titulo", "h2"],
        label: "Título 2",
        value: KEYS.h2,
      },
      {
        icon: <Heading3Icon />,
        keywords: ["titulo", "h3"],
        label: "Título 3",
        value: KEYS.h3,
      },
      {
        icon: <Square />,
        keywords: ["checklist", "task", "checkbox", "tarea", "[]"],
        label: "Lista de tareas",
        value: KEYS.listTodo,
      },
      {
        icon: <ListIcon />,
        keywords: ["unordered", "ul", "vinetas", "-"],
        label: "Lista con viñetas",
        value: KEYS.ul,
      },
      {
        icon: <ListOrdered />,
        keywords: ["ordered", "ol", "numerada", "1"],
        label: "Lista numerada",
        value: KEYS.ol,
      },
      {
        icon: <ChevronRightIcon />,
        keywords: [
          "toggle",
          "acordeon",
          "seccion",
          "colapsar",
          "plegable",
          "collapsible",
        ],
        label: "Sección desplegable",
        value: KEYS.toggle,
      },
      {
        icon: <Quote />,
        keywords: ["citation", "blockquote", "cita", ">"],
        label: "Cita",
        value: KEYS.blockquote,
      },
      {
        icon: <Code2 />,
        keywords: ["```", "codigo"],
        label: "Código",
        value: KEYS.codeBlock,
      },
      {
        icon: <SeparatorHorizontalIcon />,
        keywords: ["divider", "hr", "linea", "separador", "---"],
        label: "Separador",
        value: KEYS.hr,
      },
      {
        icon: <Table />,
        keywords: ["table", "tabla", "grid", "cuadro"],
        label: "Tabla",
        value: KEYS.table,
      },
    ].map((item) => ({
      ...item,
      onSelect: (editor: PlateEditor, value: string) => {
        insertBlock(editor, value, { upsert: true })
      },
    })),
  },
]

export function SlashInputElement(
  props: PlateElementProps<TComboboxInputElement>
) {
  const { editor, element } = props
  const statuses = useStatuses()

  return (
    <PlateElement {...props} as="span">
      <InlineCombobox element={element} trigger="/">
        <InlineComboboxInput />

        <InlineComboboxContent>
          <InlineComboboxEmpty>Sin resultados</InlineComboboxEmpty>

          {groups.map(({ group, items }) => (
            <InlineComboboxGroup key={group}>
              <InlineComboboxGroupLabel>{group}</InlineComboboxGroupLabel>

              {items.map(({ icon, keywords, label, value, onSelect }) => (
                <InlineComboboxItem
                  key={value}
                  value={value}
                  onClick={() => onSelect(editor, value)}
                  label={label}
                  group={group}
                  keywords={keywords}
                >
                  <div className="text-muted-foreground mr-2">{icon}</div>
                  {label ?? value}
                </InlineComboboxItem>
              ))}
            </InlineComboboxGroup>
          ))}

          {statuses.length > 0 && (
            <InlineComboboxGroup>
              <InlineComboboxGroupLabel>Estados</InlineComboboxGroupLabel>

              {statuses.map((status) => (
                <InlineComboboxItem
                  group="Estados"
                  key={status.name}
                  keywords={["estado", "status", "etiqueta"]}
                  label={status.name}
                  onClick={() => insertStatus(editor, status)}
                  value={`status:${status.name}`}
                >
                  <StatusPill status={status} />
                </InlineComboboxItem>
              ))}
            </InlineComboboxGroup>
          )}
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}
