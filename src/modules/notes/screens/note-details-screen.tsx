import { Link } from "@tanstack/react-router"

import { Button } from "@/shared/components/ui/button"

import type { Note } from "../types/note"

interface NoteDetailsScreenProps {
  note: Note
}

const DETAIL_DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeStyle: "short",
})

export function NoteDetailsScreen({ note }: NoteDetailsScreenProps) {
  return (
    <article className="note-details">
      <div className="note-details-back">
        <Button
          render={
            <Link
              search={{ page: 1, query: "", sort: "updated", view: "all" }}
              to="/notes"
            />
          }
          variant="link"
        >
          <span aria-hidden="true">←</span> Back to notes
        </Button>
      </div>
      <header>
        <span className={`visibility visibility-${note.visibility}`}>
          {note.visibility}
        </span>
        <h1>{note.title}</h1>
        <p>{note.excerpt}</p>
        <time dateTime={note.updatedAt}>
          Updated {DETAIL_DATE_FORMATTER.format(new Date(note.updatedAt))}
        </time>
      </header>
      <div className="note-body">
        <p>{note.content}</p>
      </div>
    </article>
  )
}
