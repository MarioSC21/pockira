"use client"

import { createPlatePlugin } from "platejs/react"

import { StatusElement } from "@/shared/components/custom-components/editor/components/status-node"

export const STATUS_KEY = "status"

// A status is a tag inside the text: it sits in a line like a word, cannot be
// typed into, and carries its name and color.
export const StatusPlugin = createPlatePlugin({
  key: STATUS_KEY,
  node: {
    component: StatusElement,
    isElement: true,
    isInline: true,
    isVoid: true,
  },
})

export const StatusKit = [StatusPlugin]
