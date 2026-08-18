import { createClient } from "@insforge/sdk"

const getRequiredEnvironmentVariable = (name: keyof ImportMetaEnv): string => {
  const value = import.meta.env[name]

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }

  return value
}

export const insforge = createClient({
  anonKey: getRequiredEnvironmentVariable("VITE_INSFORGE_ANON_KEY"),
  baseUrl: getRequiredEnvironmentVariable("VITE_INSFORGE_URL"),
})
