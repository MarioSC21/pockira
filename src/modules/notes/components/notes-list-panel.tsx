import {
  ClockIcon,
  LockIcon,
  PinIcon,
  PlusIcon,
  SearchIcon,
} from "lucide-react"

import { NotesWeekCalendar } from "@/modules/notes/components/notes-week-calendar"
import type { DemoNote } from "@/modules/notes/lib/demo-notes"
import { extractText } from "@/modules/notes/lib/note-body"
import { Badge } from "@/shared/components/ui/badge"
import { Button } from "@/shared/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group"
import { Tabs, TabsList, TabsTrigger } from "@/shared/components/ui/tabs"
import { cn } from "@/shared/lib/utils"

interface NotesListPanelProps {
  open: boolean
  notes: DemoNote[]
  selectedDate: Date
  selectedNoteId: string | undefined
  onSelectDate: (date: Date) => void
  onSelectNote: (id: string) => void
  onCreateNote: () => void
}

export function NotesListPanel({
  open,
  notes,
  selectedDate,
  selectedNoteId,
  onSelectDate,
  onSelectNote,
  onCreateNote,
}: NotesListPanelProps) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col overflow-hidden border-r transition-[width] duration-200",
        open ? "w-full md:w-80" : "w-0 border-r-0"
      )}
    >
      <div className="flex w-full shrink-0 flex-col gap-4 border-b p-4 md:w-80">
        <NotesWeekCalendar onSelect={onSelectDate} selected={selectedDate} />
        <InputGroup>
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput placeholder="Buscar notas..." />
        </InputGroup>
        <Tabs defaultValue="todas">
          <TabsList className="h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="hoy">Hoy</TabsTrigger>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="personales">Personales</TabsTrigger>
            <TabsTrigger value="compartidas">Compartidas</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="relative min-h-0 w-full flex-1 md:w-80">
        <div className="h-full overflow-y-auto p-4">
          <div className="flex flex-col gap-3 pb-16">
            {notes.map((note) => (
              <NoteListCard
                isActive={note.id === selectedNoteId}
                key={note.id}
                note={note}
                onSelect={() => onSelectNote(note.id)}
              />
            ))}
          </div>
        </div>
        <Button
          className="absolute right-4 bottom-4 size-11 rounded-full shadow-lg"
          onClick={onCreateNote}
          size="icon"
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
}

function NoteListCard({
  note,
  isActive,
  onSelect,
}: {
  note: DemoNote
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      className={cn(
        "bg-card relative w-full rounded-2xl border p-3 text-left",
        isActive && "border-primary"
      )}
      onClick={onSelect}
      type="button"
    >
      {note.pinned && (
        <PinIcon className="text-muted-foreground absolute top-3 right-3 size-3.5" />
      )}
      <p className="pr-6 text-sm font-medium">{note.title || "Nueva nota"}</p>
      <p className="text-muted-foreground mt-1 line-clamp-1 text-xs">
        {extractText(note.body) || "Sin contenido"}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        {note.tags.map((tag) => (
          <Badge className="gap-1" key={tag.label} variant="secondary">
            {tag.icon === "lock" && <LockIcon />}
            {tag.icon === "clock" && <ClockIcon />}
            {tag.label}
          </Badge>
        ))}
      </div>
    </button>
  )
}
