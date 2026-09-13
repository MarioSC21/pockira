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
  overrides: [
    {
      // Vendored shadcn/diceui/plate primitives: keep upstream source as-is
      // instead of reshaping it to satisfy app-level strictness rules.
      files: [
        "src/shared/components/ui/**",
        "src/shared/components/custom-components/editor/**",
        "src/shared/hooks/use-mobile.ts",
        "src/shared/hooks/use-callback-ref.ts",
      ],
      rules: {
        "no-shadow": "off",
        "no-param-reassign": "off",
        "no-unused-vars": "off",
        curly: "off",
        "require-unicode-regexp": "off",
        "no-duplicate-imports": "off",
        "prefer-destructuring": "off",
        "prefer-arrow-callback": "off",
        "import/no-duplicates": "off",
        "unicorn/no-array-for-each": "off",
        "unicorn/no-useless-spread": "off",
        "react/no-react-children": "off",
        "react/no-clone-element": "off",
        "typescript/consistent-type-definitions": "off",
        "react/hook-use-state": "off",
        "react/set-state-in-effect": "off",
        "unicorn/no-document-cookie": "off",
        "unicorn/no-useless-undefined": "off",
        "unicorn/prefer-spread": "off",
        "jsx-a11y/prefer-tag-over-role": "off",
        "jsx-a11y/click-events-have-key-events": "off",
        "jsx-a11y/no-noninteractive-element-interactions": "off",
        "jsx-a11y/mouse-events-have-key-events": "off",
        "jsx-a11y/interactive-supports-focus": "off",
        "promise/prefer-await-to-callbacks": "off",
        "react/no-unstable-nested-components": "off",
        "react/function-component-definition": "off",
        "react/display-name": "off",
        "react/rule-suppression": "off",
        "react/hooks": "off",
        "react/exhaustive-effect-dependencies": "off",
        "import/consistent-type-specifier-style": "off",
        "typescript/no-non-null-assertion": "off",
        "typescript/no-explicit-any": "off",
        "jsx-a11y/control-has-associated-label": "off",
      },
    },
  ],
})
