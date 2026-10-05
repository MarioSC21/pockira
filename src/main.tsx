import { StrictMode } from "react"
import { createRoot } from "react-dom/client"

import { applyWindowChrome } from "@/shared/lib/window-chrome"
import { AppProvider } from "@/shared/providers/provider"

import "./styles/app.css"

const rootElement = document.querySelector("#root")

if (!rootElement) {
  throw new Error("The root element was not found")
}

applyWindowChrome()

createRoot(rootElement).render(
  <StrictMode>
    <AppProvider />
  </StrictMode>
)
