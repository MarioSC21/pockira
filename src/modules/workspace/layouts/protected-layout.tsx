import { Link, Outlet } from "@tanstack/react-router"
import { FileText, TimerIcon } from "lucide-react"
import type { ReactNode } from "react"

import { ThemeMenu } from "@/modules/workspace/components/theme-menu"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
} from "@/shared/components/ui/sidebar"

const navigationItems = [
  { icon: FileText, label: "Mis notas", to: "/notes" },
  { icon: TimerIcon, label: "Pomodoro", to: "/pomodoro" },
] as const

interface ProtectedLayoutProps {
  /** Account controls pinned to the bottom of the sidebar. */
  footer?: ReactNode
}

export function ProtectedLayout({ footer }: ProtectedLayoutProps) {
  return (
    // h-app / top offset: the desktop title bar takes the top of the window,
    // so the sidebar and the content fit below it instead of the full viewport.
    <SidebarProvider
      className="h-app min-h-0"
      onOpenChange={() => null}
      open={false}
    >
      <Sidebar
        className="top-(--titlebar-height) bottom-0 h-auto"
        collapsible="icon"
      >
        <SidebarHeader>
          <Link
            className="flex items-center gap-2 px-2 group-data-[collapsible=icon]:px-0"
            to="/notes"
          >
            <img alt="Pockira" className="size-8 shrink-0" src="/pockira.svg" />
            <span className="font-heading truncate text-lg font-semibold group-data-[collapsible=icon]:hidden">
              Pockira
            </span>
          </Link>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>Navegación</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map(({ icon: Icon, label, to }) => (
                  <SidebarMenuItem key={to}>
                    <SidebarMenuButton
                      render={
                        <Link activeProps={{ "data-active": true }} to={to} />
                      }
                      tooltip={label}
                    >
                      <Icon aria-hidden="true" />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
        <SidebarFooter>
          <ThemeMenu />
          {footer}
        </SidebarFooter>
      </Sidebar>
      {/* min-w-0: the inset is a flex item next to the sidebar and defaults to
          min-width:auto, so its content width pushed the page wider than the
          viewport and produced a horizontal scrollbar.
          h-app: the screens inside size themselves against this height, so it
          has to be definite -- a percentage or inline height:100% resolves to
          auto otherwise and the page scrolls instead of the panels. */}
      <SidebarInset className="h-app min-w-0 overflow-hidden">
        <main className="min-h-0 min-w-0 flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
