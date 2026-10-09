import {
  ClockIcon,
  LockIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
  Trash2Icon,
} from "lucide-react"
import { useState } from "react"

import { DeleteNoteDialog } from "@/modules/notes/components/delete-note-dialog"
import { NotesWeekCalendar } from "@/modules/notes/components/notes-week-calendar"
import { extractText } from "@/modules/notes/lib/note-body"
import {
  describeEmptyList,
  filterToTab,
  tabToFilter,
} from "@/modules/notes/lib/note-filters"
import type {
  NoteFilter,
  NoteFilterTab,
} from "@/modules/notes/lib/note-filters"
import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import { noteTags } from "@/modules/notes/lib/workspace-note"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { cn } from "@/shared/lib/utils"

interface NotesListPanelProps {
  notes: WorkspaceNote[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  selectedDate: Date
  selectedNoteId: string | undefined
  filter: NoteFilter
  search: string
  onSelectDate: (date: Date) => void
  onFilterChange: (filter: NoteFilter) => void
  onSearchChange: (search: string) => void
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onTogglePin: (id: string) => void
  onDeleteNote: (id: string) => void
}

export function NotesListPanel({
  notes,
  isLoading,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedDate,
  selectedNoteId,
  filter,
  search,
  onSelectDate,
  onFilterChange,
  onSearchChange,
  onSelectNote,
  onCreateNote,
  onTogglePin,
  onDeleteNote,
}: NotesListPanelProps) {
  const [noteIdToDelete, setNoteIdToDelete] = useState<string>()

  const orderedNotes = [
    ...notes.filter((note) => note.pinned),
    ...notes.filter((note) => !note.pinned),
  ]

  return (
    // The width is owned by the parent (a ResizablePanel on desktop), so this
    // panel just fills whatever it is given.
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden">
      <div className="flex w-full shrink-0 flex-col gap-4 border-b p-4">
        <NotesWeekCalendar onSelect={onSelectDate} selected={selectedDate} />
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Buscar notas..."
            value={search}
          />
        </InputGroup>
        <Tabs
          onValueChange={(value) =>
            onFilterChange(tabToFilter(value as NoteFilterTab))
          }
          value={filterToTab(filter)}
        >
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="personales">Personales</TabsTrigger>
            <TabsTrigger value="compartidas">Compartidas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="relative min-h-0 w-full flex-1">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-3 p-4 pb-16">
            {error ? (
              <p
                className="text-destructive py-2 text-center text-sm"
                role="alert"
              >
                {error}
              </p>
            ) : null}
            {isLoading ? (
              <p className="text-muted-foreground py-8 text-center text-sm">
                Cargando notas…
              </p>
            ) : null}
            {!isLoading && orderedNotes.length === 0 && (
              <p className="text-muted-foreground py-8 text-center text-sm">
                {describeEmptyList(filter, search)}
              </p>
            )}
            {orderedNotes.map((note) => (
              <NoteListCard
                isActive={note.id === selectedNoteId}
                key={note.id}
                note={note}
                onRequestDelete={() => setNoteIdToDelete(note.id)}
                onSelect={() => onSelectNote(note.id)}
                onTogglePin={() => onTogglePin(note.id)}
              />
            ))}
            {hasMore ? (
              <Button
                disabled={isLoadingMore}
                onClick={onLoadMore}
                variant="ghost"
              >
                {isLoadingMore ? "Cargando…" : "Cargar más"}
              </Button>
            ) : null}
          </div>
        </ScrollArea>
        <Button
          className="absolute right-4 bottom-4 size-11 rounded-full shadow-lg"
          onClick={onCreateNote}
          size="icon"
        >
          <PlusIcon />
        </Button>
      </div>
      {noteIdToDelete && (
        <DeleteNoteDialog
          onConfirm={() => onDeleteNote(noteIdToDelete)}
          onOpenChange={(isDialogOpen) => {
            if (!isDialogOpen) {
              setNoteIdToDelete(undefined)
            }
          }}
          open
        />
      )}
    </div>
  )
}

function NoteListCard({
  note,
  isActive,
  onSelect,
  onTogglePin,
  onRequestDelete,
}: {
  note: WorkspaceNote
  isActive: boolean
  onSelect: () => void
  onTogglePin: () => void
  onRequestDelete: () => void
}) {
  return (
    <div
      className={cn(
        "bg-card relative rounded-2xl border",
        isActive && "border-primary"
      )}
    >
      <button
        className="w-full rounded-2xl p-3 text-left"
        onClick={onSelect}
        type="button"
      >
        <p className="pr-14 text-sm font-medium">
          {note.title || "Nueva nota"}
        </p>
        <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
          {extractText(note.body) || "Sin contenido"}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {noteTags(note).map((tag) => (
            <Badge className="gap-1" key={tag.label} variant="secondary">
              {tag.icon === "lock" && <LockIcon />}
              {tag.icon === "clock" && <ClockIcon />}
              {tag.label}
            </Badge>
          ))}
        </div>
      </button>
      {/* h-5 matches the title's line-height so the icons center on it. */}
      <div className="absolute top-3 right-3 flex h-5 items-center gap-2">
        {note.isOwner ? (
          <button
            aria-label="Eliminar nota"
            className="text-muted-foreground/50 hover:text-destructive rounded-sm disabled:pointer-events-none disabled:opacity-40"
            disabled={Boolean(note.deleteDisabledReason)}
            onClick={onRequestDelete}
            title={note.deleteDisabledReason}
            type="button"
          >
            {/* size-3: the trash glyph is wider and bottom-heavy, so at the pin's
              14px it reads as bigger and lower than it. */}
            <Trash2Icon className="size-3" />
          </button>
        ) : null}
        <button
          aria-label={note.pinned ? "Dejar de fijar nota" : "Fijar nota"}
          aria-pressed={note.pinned}
          className={cn(
            "hover:text-foreground rounded-sm",
            note.pinned ? "text-foreground" : "text-muted-foreground/50"
          )}
          onClick={onTogglePin}
          type="button"
        >
          <PinIcon className={cn("size-3.5", note.pinned && "fill-current")} />
        </button>
      </div>
    </div>
  )
}
