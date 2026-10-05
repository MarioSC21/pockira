import { createFileRoute } from "@tanstack/react-router"

import { PomodoroScreen } from "@/modules/pomodoro"

export const Route = createFileRoute("/(workspace)/_protected/pomodoro")({
  component: PomodoroScreen,
})
