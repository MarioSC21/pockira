import { Outlet } from "@tanstack/react-router"

export function AuthLayout() {
  return (
    <main className="bg-background grid min-h-screen place-items-center p-6">
      <section className="bg-card shadow-foreground/5 w-full max-w-md rounded-4xl border p-8 shadow-xl">
        <div className="mb-8 text-center">
          <span className="font-heading text-4xl tracking-[0.16em]">
            Pockira
          </span>
        </div>
        <Outlet />
      </section>
    </main>
  )
}
