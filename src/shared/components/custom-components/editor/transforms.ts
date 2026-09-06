"use client"

import { insertCodeBlock } from "@platejs/code-block"
import { KEYS, PathApi } from "platejs"
import type { Path, TElement } from "platejs"
import type { PlateEditor } from "platejs/react"

const insertList = (editor: PlateEditor, type: string) => {
  editor.tf.insertNodes(
    editor.api.create.block({
      indent: 1,
      listStyleType: type,
    }),
    { select: true }
  )
}

const createBlockquote = (editor: PlateEditor) => ({
  children: [editor.api.create.block({ type: KEYS.p })],
  type: KEYS.blockquote,
})

const selectBlockquoteStart = (editor: PlateEditor, path: Path) => {
  const start = editor.api.start(path.concat([0]))

  if (start) {
    editor.tf.select(start)
  }
}

const insertBlockMap: Record<
  string,
  (editor: PlateEditor, type: string) => void
> = {
  [KEYS.listTodo]: insertList,
  [KEYS.ol]: insertList,
  [KEYS.ul]: insertList,
  [KEYS.codeBlock]: (editor) => insertCodeBlock(editor, { select: true }),
}

interface InsertBlockOptions {
  upsert?: boolean
}

export const getBlockType = (block: TElement) => {
  if (block[KEYS.listType]) {
    if (block[KEYS.listType] === KEYS.ol) {
      return KEYS.ol
    }
    if (block[KEYS.listType] === KEYS.listTodo) {
      return KEYS.listTodo
    }
    return KEYS.ul
  }

  return block.type
}

export const insertBlock = (
  editor: PlateEditor,
  type: string,
  options: InsertBlockOptions = {}
) => {
  const { upsert = false } = options

  editor.tf.withoutNormalizing(() => {
    const block = editor.api.block()

    if (!block) {
      return
    }

    const [currentNode, path] = block
    const isCurrentBlockEmpty = editor.api.isEmpty(currentNode)
    const currentBlockType = getBlockType(currentNode)

    const isSameBlockType = type === currentBlockType

    if (upsert && isCurrentBlockEmpty && isSameBlockType) {
      return
    }

    if (type === KEYS.blockquote) {
      const insertPath = PathApi.next(path)

      editor.tf.insertNodes(createBlockquote(editor), { at: insertPath })

      if (!isSameBlockType && isCurrentBlockEmpty) {
        editor.tf.removeNodes({ at: path })
      }

      selectBlockquoteStart(
        editor,
        isCurrentBlockEmpty && !isSameBlockType ? path : insertPath
      )

      return
    }
    if (type in insertBlockMap) {
      insertBlockMap[type](editor, type)
    } else {
      editor.tf.insertNodes(editor.api.create.block({ type }), {
        at: PathApi.next(path),
        select: true,
      })
    }

    if (!isSameBlockType) {
      editor.tf.removeNodes({ previousEmptyBlock: true })
    }
  })
}
