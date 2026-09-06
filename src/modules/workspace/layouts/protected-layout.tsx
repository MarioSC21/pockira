import { Link, Outlet } from "@tanstack/react-router"
import { FileText } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
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
] as const

export function ProtectedLayout() {
  return (
    <SidebarProvider onOpenChange={() => null} open={false}>
      <Sidebar collapsible="icon">
        <SidebarHeader>
          <Link
            className="font-heading truncate px-2 text-lg font-semibold group-data-[collapsible=icon]:opacity-0"
            to="/notes"
          >
            Pockira
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
      </Sidebar>
      <SidebarInset>
        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
