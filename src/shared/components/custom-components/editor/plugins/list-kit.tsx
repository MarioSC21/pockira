"use client"

import {
  BulletedListRules,
  isOrderedList,
  OrderedListRules,
  TaskListRules,
} from "@platejs/list"
import { ListPlugin } from "@platejs/list/react"
import { KEYS } from "platejs"

import { BlockList } from "@/shared/components/custom-components/editor/components/block-list"
import { IndentKit } from "@/shared/components/custom-components/editor/plugins/indent-kit"
import { cn } from "@/shared/lib/utils"

export const ListKit = [
  ...IndentKit,
  ListPlugin.configure({
    inputRules: [
      BulletedListRules.markdown({ variant: "-" }),
      BulletedListRules.markdown({ variant: "*" }),
      OrderedListRules.markdown({ variant: "." }),
      OrderedListRules.markdown({ variant: ")" }),
      TaskListRules.markdown({ checked: false }),
      TaskListRules.markdown({ checked: true }),
    ],
    inject: {
      nodeProps: {
        nodeKey: KEYS.listType,
        query: ({ nodeProps }) => {
          const { element } = nodeProps

          return !!element?.listStyleType && !isOrderedList(element)
        },
        // The browser's bullet sits on the text baseline and cannot be moved,
        // so it is drawn instead: left at its static position (the top of the
        // first line, whatever the block's padding) and pushed down half a
        // line, it stays centered on that line like the todo checkbox.
        transformProps: ({ nodeValue, props }) => ({
          ...props,
          className: cn(
            props.className,
            "before:absolute before:-left-3 before:mt-[calc(0.5lh-2.5px)] before:size-[5px] before:rounded-full before:content-['']",
            nodeValue === "circle"
              ? "before:border before:border-current"
              : "before:bg-current",
            nodeValue === "square" && "before:rounded-none"
          ),
          role: "listitem",
          style: {
            ...props.style,
            display: "list-item",
            listStyleType: "none",
          },
        }),
      },
      targetPlugins: [
        ...KEYS.heading,
        KEYS.p,
        KEYS.blockquote,
        KEYS.codeBlock,
        KEYS.toggle,
        KEYS.img,
      ],
    },
    render: {
      belowNodes: BlockList,
    },
  }),
]
