"use client"

import {
  Code2,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  ListIcon,
  ListOrdered,
  PilcrowIcon,
  Quote,
  Square,
} from "lucide-react"
import { KEYS } from "platejs"
import type { TComboboxInputElement } from "platejs"
import type { PlateEditor, PlateElementProps } from "platejs/react"
import { PlateElement } from "platejs/react"
import * as React from "react"

import { insertBlock } from "@/shared/components/custom-components/editor/transforms"

import {
  InlineCombobox,
  InlineComboboxContent,
  InlineComboboxEmpty,
  InlineComboboxGroup,
  InlineComboboxGroupLabel,
  InlineComboboxInput,
  InlineComboboxItem,
} from "./inline-combobox"

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
        </InlineComboboxContent>
      </InlineCombobox>

      {props.children}
    </PlateElement>
  )
}
