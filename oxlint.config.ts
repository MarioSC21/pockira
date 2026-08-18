import { defineConfig } from "oxlint"
import core from "ultracite/oxlint/core"
import react from "ultracite/oxlint/react"
import tanstack from "ultracite/oxlint/tanstack"

export default defineConfig({
  extends: [core, react, tanstack],
  ignorePatterns: [...(core.ignorePatterns ?? []), "**/routeTree.gen.ts"],
  rules: {
    "no-use-before-define": "off",
    "sort-keys": "off",
    "func-style": [
      "error",
      "declaration",
      {
        allowArrowFunctions: true,
      },
    ],
    "react/function-component-definition": [
      "error",
      {
        namedComponents: "function-declaration",
      },
    ],
    "unicorn/filename-case": "off",
  },
})
