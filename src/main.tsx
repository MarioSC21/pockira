import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { initTheme } from "@/shared/lib/theme"
import { applyWindowChrome } from "@/shared/lib/window-chrome"
import { AppProvider } from "@/shared/providers/provider"

import "./styles/app.css"

const rootElement = document.querySelector("#root")

if (!rootElement) {
  throw new Error("The root element was not found")
}

applyWindowChrome()
initTheme()

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider />
  </StrictMode>
)
