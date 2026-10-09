"use client"

import { isOrderedList } from "@platejs/list"
import {
  useTodoListElement,
  useTodoListElementState,
} from "@platejs/list/react"
import type { TListElement } from "platejs"
import { useReadOnly } from "platejs/react"
import type { PlateElementProps, RenderNodeWrapper } from "platejs/react"
import React from "react"

import { Checkbox } from "@/shared/components/ui/checkbox"
import { cn } from "@/shared/lib/utils"

const config: Record<
  string,
  {
    Li: React.FC<PlateElementProps & { lineBreakBadge?: React.ReactNode }>
    Marker: React.FC<PlateElementProps>
  }
> = {
  todo: {
    Li: TodoLi,
    Marker: TodoMarker,
  },
}

export const BlockList: RenderNodeWrapper = (props) => {
  if (!props.element.listStyleType) {
    return
  }
  if (!isOrderedList(props.element)) {
    return (props) => (
      <>
        <BulletMarker {...props} />
        {props.children}
      </>
    )
  }

  return (props) => <List {...props} />
}

function BulletMarker({ element }: PlateElementProps) {
  return (
    <span
      aria-hidden="true"
      // Static positioning follows the block's padding and first text line.
      // A separate element leaves ::before available for block placeholders.
      className={cn(
        "pointer-events-none absolute -left-3 mt-[calc(0.5lh-2.5px)] size-[5px] rounded-full select-none",
        element.listStyleType === "circle"
          ? "border border-current"
          : "bg-current",
        element.listStyleType === "square" && "rounded-none"
      )}
      contentEditable={false}
    />
  )
}

function List(props: PlateElementProps & { lineBreakBadge?: React.ReactNode }) {
  const { listStart, listStyleType } = props.element as TListElement
  const { Li, Marker } = config[listStyleType] ?? {}
  const List = isOrderedList(props.element) ? "ol" : "ul"

  return (
    <List
      className="relative m-0 p-0"
      style={{ listStyleType }}
      start={listStart}
    >
      {Marker && <Marker {...props} />}
      {Li ? (
        <Li {...props} />
      ) : (
        <li>
          {props.children}
          {props.lineBreakBadge}
        </li>
      )}
    </List>
  )
}

function TodoMarker(props: PlateElementProps) {
  const state = useTodoListElementState({ element: props.element })
  const { checkboxProps } = useTodoListElement(state)
  const readOnly = useReadOnly()

  // A box one line tall centers the checkbox on
  // the first line of text instead of pinning it to a fixed offset.
  return (
    <div
      className="absolute top-0 -left-6 flex h-lh items-center"
      contentEditable={false}
    >
      <Checkbox
        className={cn(
          // cursor-pointer: the editor container sets cursor-text, which the
          // checkbox would otherwise inherit and read as non-interactive.
          "cursor-pointer",
          readOnly && "pointer-events-none cursor-text"
        )}
        {...checkboxProps}
      />
    </div>
  )
}

function TodoLi(
  props: PlateElementProps & { lineBreakBadge?: React.ReactNode }
) {
  return (
    <li
      className={cn(
        "list-none",
        (props.element.checked as boolean) &&
          "text-muted-foreground line-through"
      )}
    >
      {props.children}
      {props.lineBreakBadge}
    </li>
  )
}
