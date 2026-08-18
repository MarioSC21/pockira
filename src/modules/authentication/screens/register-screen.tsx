import { Link } from "@tanstack/react-router"

export function RegisterScreen() {
  return (
    <div className="text-center">
      <span className="text-primary text-xs font-semibold tracking-[0.18em] uppercase">
        Primer acceso
      </span>
      <h1 className="font-heading mt-3 text-3xl font-semibold">
        Crea tu espacio en Pockira
      </h1>
      <p className="text-muted-foreground mt-3 text-sm">
        El registro con Google se implementará en el siguiente paso.
      </p>
      <p className="mt-8 text-sm">
        ¿Ya tienes una cuenta?{" "}
        <Link
          className="text-primary font-semibold hover:underline"
          to="/login"
        >
          Iniciar sesión
        </Link>
      </p>
    </div>
  )
}
