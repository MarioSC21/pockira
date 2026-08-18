import { Link, Outlet } from "@tanstack/react-router"
import { FileText, Settings, Users } from "lucide-react"

const navigationItems = [
  { icon: FileText, label: "Mis notas", to: "/notes" },
  { icon: Users, label: "Notas compartidas", to: "/notes/shared" },
  { icon: Settings, label: "Ajustes", to: "/settings" },
] as const

export function ProtectedLayout() {
  return (
    <div className="bg-background grid min-h-screen grid-cols-[16rem_1fr]">
      <aside className="bg-card flex flex-col border-r p-5">
        <Link className="font-heading px-3 text-2xl font-semibold" to="/notes">
          Pockira
        </Link>
        <nav className="mt-10 grid gap-2" aria-label="Navegación principal">
          {navigationItems.map(({ icon: Icon, label, to }) => (
            <Link
              activeProps={{ className: "bg-muted text-foreground" }}
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium"
              key={to}
              to={to}
            >
              <Icon aria-hidden="true" className="size-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 p-8">
        <Outlet />
      </main>
    </div>
  )
}
