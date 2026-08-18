import { Link } from "@tanstack/react-router"

export function LoginScreen() {
  return (
    <div className="text-center">
      <span className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
        Bienvenido
      </span>
      <h1 className="font-heading mt-3 text-3xl font-semibold">
        Vuelve a tus notas
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        La conexión con Google se implementará en el siguiente paso.
      </p>
      <p className="mt-8 text-sm">
        ¿Primera vez en Pockira?{" "}
        <Link
          className="text-primary font-semibold hover:underline"
          to="/register"
        >
          Crear cuenta
        </Link>
      </p>
    </div>
  )
}
