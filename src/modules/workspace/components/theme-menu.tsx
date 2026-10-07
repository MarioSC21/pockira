import { MonitorIcon, PaletteIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip"
import {
  readThemePreference,
  setThemePreference,
  THEMES,
} from "@/shared/lib/theme"
import type { ThemePreference } from "@/shared/lib/theme"

const FAMILIES = [...new Set(THEMES.map((theme) => theme.family))]

/** Two-tone dot previewing a theme's background and accent. */
function ThemeSwatch({ colors }: { colors: readonly [string, string] }) {
  return (
    <span
      aria-hidden="true"
      className="ring-foreground/15 size-4 shrink-0 rounded-full ring-1"
      style={{
        background: `linear-gradient(135deg, ${colors[0]} 50%, ${colors[1]} 50%)`,
      }}
    />
  )
}

/** Sidebar button that switches the app color theme. */
export function ThemeMenu() {
  const [preference, setPreference] =
    useState<ThemePreference>(readThemePreference)

  const handleChange = (value: ThemePreference) => {
    setPreference(value)
    setThemePreference(value)
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              aria-label="Tema"
              render={<Button size="icon-lg" variant="ghost" />}
            />
          }
        >
          <PaletteIcon />
        </TooltipTrigger>
        <TooltipContent side="right">Tema</TooltipContent>
      </Tooltip>
      {/* Opens beside the icon rail, like the account menu below it. */}
      <DropdownMenuContent align="end" className="w-auto min-w-52" side="right">
        <DropdownMenuRadioGroup
          onValueChange={(value) => handleChange(value as ThemePreference)}
          value={preference}
        >
          <DropdownMenuRadioItem value="system">
            <MonitorIcon aria-hidden="true" />
            Sistema
          </DropdownMenuRadioItem>
          {FAMILIES.map((family) => (
            <DropdownMenuGroup key={family}>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{family}</DropdownMenuLabel>
              {THEMES.filter((theme) => theme.family === family).map(
                (theme) => (
                  <DropdownMenuRadioItem key={theme.id} value={theme.id}>
                    <ThemeSwatch colors={theme.swatch} />
                    {theme.label}
                  </DropdownMenuRadioItem>
                )
              )}
            </DropdownMenuGroup>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
