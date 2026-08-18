import { Link } from "@tanstack/react-router"
import type { ChangeEvent } from "react"

import type { NotesSearch } from "@/modules/notes/schemas/notes-search-schema"
import type { Note } from "@/modules/notes/types/note"
import { Button } from "@/shared/components/ui/button"

interface NoteCardProps {
  note: Note
}

interface NotesScreenProps {
  notes: readonly Note[]
  onSearchChange: (updates: Partial<NotesSearch>) => void
  pageCount: number
  search: NotesSearch
  total: number
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
})

const VIEW_OPTIONS = [
  { label: "All notes", value: "all" },
  { label: "Personal", value: "personal" },
  { label: "Shared", value: "shared" },
] as const

function NoteCard({ note }: NoteCardProps) {
  return (
    <article className="note-card">
      <div className="note-card-topline">
        <span className={`visibility visibility-${note.visibility}`}>
          {note.visibility}
        </span>
        <time dateTime={note.updatedAt}>
          {DATE_FORMATTER.format(new Date(note.updatedAt))}
        </time>
      </div>
      <h2>{note.title}</h2>
      <p>{note.excerpt}</p>
      <div className="note-card-footer">
        <Button
          render={<Link params={{ noteId: note.id }} to="/notes/$noteId" />}
          variant="link"
        >
          Open note <span aria-hidden="true">→</span>
        </Button>
      </div>
    </article>
  )
}

export function NotesScreen({
  notes,
  onSearchChange,
  pageCount,
  search,
  total,
}: NotesScreenProps) {
  const handleNextPage = () => {
    onSearchChange({ page: Math.min(pageCount, search.page + 1) })
  }

  const handlePreviousPage = () => {
    onSearchChange({ page: Math.max(1, search.page - 1) })
  }

  const handleQueryChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSearchChange({ page: 1, query: event.currentTarget.value })
  }

  const handleSortChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const sort = event.currentTarget.value === "title" ? "title" : "updated"
    onSearchChange({ page: 1, sort })
  }

  return (
    <section className="notes-screen">
      <header className="section-heading">
        <div>
          <span className="eyebrow">Shareable workspace</span>
          <h1>Notes</h1>
          <p>Every filter below is validated, typed, and stored in the URL.</p>
        </div>
        <div className="result-count">
          <strong>{total}</strong>
          <span>{total === 1 ? "note" : "notes"}</span>
        </div>
      </header>

      <div className="filter-panel">
        <label className="search-field">
          <span>Search notes</span>
          <input
            onChange={handleQueryChange}
            placeholder="Search titles"
            type="search"
            value={search.query}
          />
        </label>

        <fieldset className="view-switcher">
          <legend>Visibility</legend>
          <div>
            {VIEW_OPTIONS.map((option) => {
              const isActive = search.view === option.value
              const handleViewChange = () => {
                onSearchChange({ page: 1, view: option.value })
              }

              return (
                <button
                  aria-pressed={isActive}
                  className={
                    isActive ? "view-option view-option-active" : "view-option"
                  }
                  key={option.value}
                  onClick={handleViewChange}
                  type="button"
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        </fieldset>

        <label className="sort-field">
          <span>Sort by</span>
          <select onChange={handleSortChange} value={search.sort}>
            <option value="updated">Recently updated</option>
            <option value="title">Title</option>
          </select>
        </label>
      </div>

      {notes.length > 0 ? (
        <div className="notes-grid">
          {notes.map((note) => (
            <NoteCard key={note.id} note={note} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>No notes match this URL state.</h2>
          <p>
            Change the search text or visibility filter to widen the results.
          </p>
        </div>
      )}

      <footer className="pagination" aria-label="Notes pagination">
        <button
          className="button button-secondary"
          disabled={search.page <= 1}
          onClick={handlePreviousPage}
          type="button"
        >
          Previous
        </button>
        <span>
          Page <strong>{search.page}</strong> of {pageCount}
        </span>
        <button
          className="button button-secondary"
          disabled={search.page >= pageCount}
          onClick={handleNextPage}
          type="button"
        >
          Next
        </button>
      </footer>
    </section>
  )
}
