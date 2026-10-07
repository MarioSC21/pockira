import { format, isToday } from "date-fns"
import { es } from "date-fns/locale"
import {
  CalendarIcon,
  ChevronDownIcon,
  ListFilterIcon,
  LockIcon,
  MoreHorizontalIcon,
  NotebookTextIcon,
  PinIcon,
  PinOffIcon,
  SearchIcon,
  SquarePenIcon,
  Trash2Icon,
  UsersIcon,
  XIcon,
} from "lucide-react"
import { useState } from "react"

import { DeleteNoteDialog } from "@/modules/notes/components/delete-note-dialog"
import { NotesWeekCalendar } from "@/modules/notes/components/notes-week-calendar"
import { extractText } from "@/modules/notes/lib/note-body"
import { describeEmptyList } from "@/modules/notes/lib/note-filters"
import type { NoteFilter } from "@/modules/notes/lib/note-filters"
import type { WorkspaceNote } from "@/modules/notes/lib/workspace-note"
import { formatNoteShortDate } from "@/modules/notes/lib/workspace-note"
import { Button } from "@/shared/components/ui/button"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/shared/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/shared/components/ui/input-group"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/components/ui/popover"
import { ScrollArea } from "@/shared/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import { cn } from "@/shared/lib/utils"

type KindFilter = "all" | "personal" | "shared"

interface NotesPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  notes: WorkspaceNote[]
  /** Notes already open in a tab, flagged in the list. */
  openNoteIds: string[]
  isLoading: boolean
  error: string | null
  hasMore: boolean
  isLoadingMore: boolean
  onLoadMore: () => void
  selectedDate: Date
  filter: NoteFilter
  search: string
  onSelectDate: (date: Date) => void
  onFilterChange: (filter: NoteFilter) => void
  onSearchChange: (search: string) => void
  onSelectNote: (id: string) => void
  onTogglePin: (id: string) => void
  onDeleteNote: (id: string) => void
}

/**
 * Desktop replacement for the notes list column: a "Notas" button in the tab
 * bar that opens the list in a popover over the editor, so the editor keeps
 * the full width.
 */
export function NotesPicker({
  open,
  onOpenChange,
  notes,
  openNoteIds,
  isLoading,
  error,
  hasMore,
  isLoadingMore,
  onLoadMore,
  selectedDate,
  filter,
  search,
  onSelectDate,
  onFilterChange,
  onSearchChange,
  onSelectNote,
  onTogglePin,
  onDeleteNote,
}: NotesPickerProps) {
  const [noteIdToDelete, setNoteIdToDelete] = useState<string>()

  const pinnedNotes = notes.filter((note) => note.pinned)
  const otherNotes = notes.filter((note) => !note.pinned)

  const handleSelectNote = (id: string) => {
    onSelectNote(id)
    onOpenChange(false)
  }

  const renderRow = (note: WorkspaceNote) => (
    <NotePickerRow
      isOpenInTab={openNoteIds.includes(note.id)}
      key={note.id}
      note={note}
      onRequestDelete={() => setNoteIdToDelete(note.id)}
      onSelect={() => handleSelectNote(note.id)}
      onTogglePin={() => onTogglePin(note.id)}
    />
  )

  return (
    <>
      <Popover onOpenChange={onOpenChange} open={open}>
        <Tooltip>
          <TooltipTrigger
            render={
              <PopoverTrigger
                render={
                  // Styled as an inactive tab so it blends into the tab strip.
                  <Button
                    className={cn(
                      "h-8 rounded-t-lg rounded-b-none px-3 font-normal",
                      open
                        ? "bg-background text-foreground hover:bg-background"
                        : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
                    )}
                    variant="ghost"
                  />
                }
              />
            }
          >
            <NotebookTextIcon />
            Notas
          </TooltipTrigger>
          <TooltipContent>Ver notas (Ctrl+\)</TooltipContent>
        </Tooltip>
        <PopoverContent
          align="start"
          className="h-[min(560px,var(--available-height))] w-100 gap-0 overflow-hidden rounded-2xl p-0"
        >
          <div className="flex shrink-0 items-center gap-1.5 border-b p-2.5">
            <InputGroup className="flex-1">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                autoFocus
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Buscar notas..."
                value={search}
              />
            </InputGroup>
            <DayFilterButton
              filter={filter}
              onClear={() => onFilterChange({ kind: "all" })}
              onSelectDate={onSelectDate}
              selectedDate={selectedDate}
            />
            <KindFilterMenu filter={filter} onFilterChange={onFilterChange} />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <div className="flex flex-col pb-2">
              {error ? (
                <p
                  className="text-destructive px-4 py-2 text-center text-sm"
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
              {!isLoading && notes.length === 0 && (
                <p className="text-muted-foreground px-4 py-8 text-center text-sm">
                  {describeEmptyList(filter, search)}
                </p>
              )}
              {pinnedNotes.length > 0 && (
                <>
                  <SectionLabel>Fijadas</SectionLabel>
                  {pinnedNotes.map(renderRow)}
                </>
              )}
              {otherNotes.length > 0 && (
                <>
                  {pinnedNotes.length > 0 && <SectionLabel>Notas</SectionLabel>}
                  {otherNotes.map(renderRow)}
                </>
              )}
              {hasMore ? (
                <Button
                  className="mx-2 mt-2"
                  disabled={isLoadingMore}
                  onClick={onLoadMore}
                  variant="ghost"
                >
                  {isLoadingMore ? "Cargando…" : "Cargar más"}
                </Button>
              ) : null}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
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
    </>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-muted-foreground px-3.5 pt-2.5 pb-1 text-[11px] font-medium tracking-wide uppercase">
      {children}
    </p>
  )
}

function DayFilterButton({
  filter,
  selectedDate,
  onSelectDate,
  onClear,
}: {
  filter: NoteFilter
  selectedDate: Date
  onSelectDate: (date: Date) => void
  onClear: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const isActive = filter.kind === "day"

  let label = "Fecha"
  if (filter.kind === "day") {
    label = isToday(filter.date)
      ? "Hoy"
      : format(filter.date, "EEE d", { locale: es })
  }

  return (
    <div className="flex shrink-0 items-center">
      <Popover onOpenChange={setIsOpen} open={isOpen}>
        <PopoverTrigger
          render={
            <Button
              aria-label="Filtrar por día"
              className={cn("capitalize", isActive && "rounded-r-none")}
              size="sm"
              variant={isActive ? "secondary" : "outline"}
            />
          }
        >
          <CalendarIcon />
          {label}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <NotesWeekCalendar
            onSelect={(date) => {
              onSelectDate(date)
              setIsOpen(false)
            }}
            selected={selectedDate}
          />
        </PopoverContent>
      </Popover>
      {isActive && (
        <Button
          aria-label="Quitar filtro de día"
          className="rounded-l-none pl-1"
          onClick={onClear}
          size="icon-sm"
          variant="secondary"
        >
          <XIcon />
        </Button>
      )}
    </div>
  )
}

function KindFilterMenu({
  filter,
  onFilterChange,
}: {
  filter: NoteFilter
  onFilterChange: (filter: NoteFilter) => void
}) {
  // The day filter is its own control; here it reads as "all kinds".
  const kind: KindFilter = filter.kind === "day" ? "all" : filter.kind
  const isActive = kind !== "all"

  let KindIcon = ListFilterIcon
  if (kind === "personal") {
    KindIcon = LockIcon
  } else if (kind === "shared") {
    KindIcon = UsersIcon
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            aria-label="Filtrar notas"
            className="shrink-0"
            size="sm"
            variant={isActive ? "secondary" : "outline"}
          />
        }
      >
        <KindIcon />
        <ChevronDownIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-40">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Mostrar</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            onValueChange={(value) =>
              onFilterChange({ kind: value as KindFilter })
            }
            value={kind}
          >
            <DropdownMenuRadioItem value="all">Todas</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="personal">
              Personales
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="shared">
              Compartidas
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function NotePickerRow({
  note,
  isOpenInTab,
  onSelect,
  onTogglePin,
  onRequestDelete,
}: {
  note: WorkspaceNote
  isOpenInTab: boolean
  onSelect: () => void
  onTogglePin: () => void
  onRequestDelete: () => void
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pinLabel = note.pinned ? "Dejar de fijar" : "Fijar"
  const PinActionIcon = note.pinned ? PinOffIcon : PinIcon

  return (
    <ContextMenu>
      <ContextMenuTrigger
        className="group/row hover:bg-muted/60 relative border-b last:border-b-0"
        render={<div />}
      >
        <button
          className="w-full px-3.5 py-2 text-left"
          onClick={onSelect}
          type="button"
        >
          <span className="flex min-w-0 items-center gap-1.5">
            {note.pinned && (
              <PinIcon className="text-muted-foreground size-3 shrink-0" />
            )}
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {note.title || "Nueva nota"}
            </span>
            {isOpenInTab && (
              <span className="text-muted-foreground rounded border px-1 text-[10px]">
                abierta
              </span>
            )}
            {note.shared ? (
              <UsersIcon
                aria-label="Compartida"
                className="text-muted-foreground size-3.5 shrink-0"
              />
            ) : (
              <LockIcon
                aria-label="Personal"
                className="text-muted-foreground size-3.5 shrink-0"
              />
            )}
            <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
              {formatNoteShortDate(note.createdAt)}
            </span>
          </span>
          <span className="text-muted-foreground mt-0.5 block truncate text-xs">
            {extractText(note.body) || "Sin contenido"}
          </span>
        </button>
        {/* Row actions show on hover/focus so the list stays quiet. */}
        <div
          className={cn(
            "bg-popover absolute top-1.5 right-2 hidden items-center gap-0.5 rounded-lg border p-0.5 shadow-sm group-focus-within/row:flex group-hover/row:flex",
            isMenuOpen && "flex"
          )}
        >
          <Button
            aria-label={pinLabel}
            onClick={onTogglePin}
            size="icon-xs"
            variant="ghost"
          >
            <PinActionIcon />
          </Button>
          {note.isOwner && (
            <Button
              aria-label="Eliminar nota"
              className="hover:text-destructive"
              onClick={onRequestDelete}
              size="icon-xs"
              variant="ghost"
            >
              <Trash2Icon />
            </Button>
          )}
          <DropdownMenu onOpenChange={setIsMenuOpen} open={isMenuOpen}>
            <DropdownMenuTrigger
              render={
                <Button
                  aria-label="Más opciones"
                  size="icon-xs"
                  variant="ghost"
                />
              }
            >
              <MoreHorizontalIcon />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-auto min-w-44">
              <DropdownMenuItem onClick={onSelect}>
                <SquarePenIcon /> Abrir en pestaña
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onTogglePin}>
                <PinActionIcon /> {pinLabel}
              </DropdownMenuItem>
              {note.isOwner && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={onRequestDelete}
                    variant="destructive"
                  >
                    <Trash2Icon /> Eliminar
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-auto min-w-44">
        <ContextMenuItem onClick={onSelect}>
          <SquarePenIcon /> Abrir en pestaña
        </ContextMenuItem>
        <ContextMenuItem onClick={onTogglePin}>
          <PinActionIcon /> {pinLabel}
        </ContextMenuItem>
        {note.isOwner && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={onRequestDelete} variant="destructive">
              <Trash2Icon /> Eliminar
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
