import type { UserSchema } from "@insforge/sdk"
import { useNavigate } from "@tanstack/react-router"
import { CloudOffIcon, LogInIcon, LogOutIcon, UserIcon } from "lucide-react"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/shared/components/ui/avatar"
import { Button } from "@/shared/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu"

import { useSignOut } from "../service/mutations"
import { useSession } from "../service/queries"

function displayName(user: UserSchema) {
  const name = user.profile?.name

  return typeof name === "string" && name.trim() ? name.trim() : null
}

function avatarUrl(user: UserSchema) {
  const url = user.profile?.avatar_url

  return typeof url === "string" && url ? url : undefined
}

/** Two letters from the name, or from the email when there is no name. */
function initials(user: UserSchema) {
  const source = displayName(user) ?? user.email
  const words = source.split(/[\s@._-]+/u).filter(Boolean)

  return (
    words
      .slice(0, 2)
      .map((word) => word[0])
      .join("")
      .toUpperCase() || "?"
  )
}

/** Avatar in the sidebar footer; its menu shows who is signed in and the
    account actions, or the guest state and a way to sign in. */
export function AccountMenu() {
  const navigate = useNavigate()
  const { data: session } = useSession()
  const signOut = useSignOut()

  if (!session) {
    return null
  }

  const { user } = session

  const handleSignOut = async () => {
    await signOut.mutateAsync(session).catch(() => null)
    await navigate({ replace: true, to: "/login" })
  }

  const handleSignIn = async () => {
    await navigate({ to: "/login" })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Cuenta"
        render={<Button size="icon-lg" variant="ghost" />}
      >
        <Avatar>
          {user ? <AvatarImage alt="" src={avatarUrl(user)} /> : null}
          <AvatarFallback>
            {user ? initials(user) : <UserIcon aria-hidden="true" />}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      {/* The sidebar is a narrow icon rail on the left, so the menu opens to
          its right instead of being clipped below it. w-auto: the base class
          sizes the menu to the 36px trigger. */}
      <DropdownMenuContent align="end" className="w-auto min-w-56" side="right">
        <DropdownMenuGroup>
          <DropdownMenuLabel>
            {user ? (
              <span className="flex flex-col gap-0.5">
                {displayName(user) ? (
                  <span className="text-foreground text-sm font-medium">
                    {displayName(user)}
                  </span>
                ) : null}
                <span className="truncate">{user.email}</span>
              </span>
            ) : (
              <span className="flex flex-col gap-0.5">
                <span className="text-foreground text-sm font-medium">
                  Modo invitado
                </span>
                <span className="flex items-center gap-1">
                  <CloudOffIcon aria-hidden="true" className="size-3" />
                  Tus notas no se sincronizan
                </span>
              </span>
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {user ? (
          <DropdownMenuItem
            disabled={signOut.isPending}
            onClick={handleSignOut}
            variant="destructive"
          >
            <LogOutIcon aria-hidden="true" />
            Cerrar sesión
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onClick={handleSignIn}>
            <LogInIcon aria-hidden="true" />
            Iniciar sesión para sincronizar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
