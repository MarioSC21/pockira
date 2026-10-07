/**
 * App color themes. Each one is a set of CSS variables in `styles/app.css`
 * keyed by `data-theme` on <html>; dark ones also get the `.dark` class so
 * `dark:` utilities keep working. `index.html` mirrors `isDark` and
 * `background` in its boot script, so keep both lists in sync.
 */
export const THEMES = [
  {
    background: "oklch(1 0 0)",
    family: "Pockira",
    id: "light",
    isDark: false,
    label: "Claro",
    swatch: ["oklch(1 0 0)", "oklch(0.205 0 0)"],
  },
  {
    background: "oklch(0.145 0 0)",
    family: "Pockira",
    id: "dark",
    isDark: true,
    label: "Oscuro",
    swatch: ["oklch(0.145 0 0)", "oklch(0.922 0 0)"],
  },
  {
    background: "#eff1f5",
    family: "Catppuccin",
    id: "catppuccin-latte",
    isDark: false,
    label: "Latte",
    swatch: ["#eff1f5", "#8839ef"],
  },
  {
    background: "#303446",
    family: "Catppuccin",
    id: "catppuccin-frappe",
    isDark: true,
    label: "Frappé",
    swatch: ["#303446", "#ca9ee6"],
  },
  {
    background: "#24273a",
    family: "Catppuccin",
    id: "catppuccin-macchiato",
    isDark: true,
    label: "Macchiato",
    swatch: ["#24273a", "#c6a0f6"],
  },
  {
    background: "#1e1e2e",
    family: "Catppuccin",
    id: "catppuccin-mocha",
    isDark: true,
    label: "Mocha",
    swatch: ["#1e1e2e", "#cba6f7"],
  },
  {
    background: "oklch(0.24 0.07 270)",
    family: "Degradado",
    id: "twilight",
    isDark: true,
    label: "Crepúsculo",
    swatch: ["oklch(0.24 0.07 280)", "oklch(0.4 0.12 315)"],
  },
  {
    background: "oklch(0.18 0.05 262)",
    family: "Degradado",
    id: "midnight",
    isDark: true,
    label: "Medianoche",
    swatch: ["oklch(0.18 0.05 262)", "oklch(0.36 0.12 268)"],
  },
] as const

export type ThemeId = (typeof THEMES)[number]["id"]
/** What the user picked: a theme, or follow the system light/dark. */
export type ThemePreference = ThemeId | "system"

const STORAGE_KEY = "pockira:theme"
const darkQuery = () => window.matchMedia("(prefers-color-scheme: dark)")

function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value)
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return isThemeId(stored) ? stored : "system"
  } catch {
    return "system"
  }
}

function resolveTheme(preference: ThemePreference) {
  let id: ThemeId = preference === "system" ? "light" : preference
  if (preference === "system" && darkQuery().matches) {
    id = "dark"
  }

  return THEMES.find((theme) => theme.id === id) ?? THEMES[0]
}

function applyTheme(preference: ThemePreference) {
  const theme = resolveTheme(preference)
  const root = document.documentElement

  root.dataset.theme = theme.id
  root.classList.toggle("dark", theme.isDark)
  // Painted behind the app (and by the boot splash) before styles load.
  root.style.setProperty("--boot-background", theme.background)
}

export function setThemePreference(preference: ThemePreference) {
  try {
    if (preference === "system") {
      localStorage.removeItem(STORAGE_KEY)
    } else {
      localStorage.setItem(STORAGE_KEY, preference)
    }
  } catch {
    // The theme still applies; it just will not survive a restart.
  }

  applyTheme(preference)
}

/** Applies the stored theme and follows the system while on "system". */
export function initTheme() {
  applyTheme(readThemePreference())

  darkQuery().addEventListener("change", () => {
    if (readThemePreference() === "system") {
      applyTheme("system")
    }
  })
}
