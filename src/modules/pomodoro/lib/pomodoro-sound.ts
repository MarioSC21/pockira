import type { PomodoroMode } from "@/modules/pomodoro/lib/pomodoro-store"

// Notes in Hz. Going to a break the melody rises (relax); going back to
// focus it falls, so you can tell them apart without looking.
const BREAK_MELODY = [523.25, 659.25, 783.99, 1046.5]
const FOCUS_MELODY = [1046.5, 783.99, 659.25, 523.25]

const NOTE_SECONDS = 0.22
const NOTE_GAP_SECONDS = 0.04
const VOLUME = 0.25
// The melody plays a few times so it is heard even away from the desk.
const REPEATS = 3
const REPEAT_GAP_SECONDS = 1.2

let context: AudioContext | undefined

function getContext() {
  context ??= new AudioContext()
  return context
}

/** Called from a click (starting the timer): browsers and WebView2 keep an
    AudioContext muted until the user has interacted, so it is created and
    resumed here, ready for when the phase ends with nobody clicking. */
export async function unlockPomodoroSound() {
  try {
    await getContext().resume()
  } catch {
    // No audio; the notification and the alert still show.
  }
}

function playNote(audio: AudioContext, frequency: number, at: number) {
  const oscillator = audio.createOscillator()
  const gain = audio.createGain()

  oscillator.type = "sine"
  oscillator.frequency.value = frequency
  // Quick attack and a soft fade, like a bell instead of a beep.
  gain.gain.setValueAtTime(0, at)
  gain.gain.linearRampToValueAtTime(VOLUME, at + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.001, at + NOTE_SECONDS * 2)

  oscillator.connect(gain)
  gain.connect(audio.destination)
  oscillator.start(at)
  oscillator.stop(at + NOTE_SECONDS * 2)
}

/** Plays the chime for the phase that is starting next. */
export async function playPomodoroChime(nextMode: PomodoroMode) {
  try {
    const audio = getContext()
    await audio.resume()

    const melody = nextMode === "focus" ? FOCUS_MELODY : BREAK_MELODY
    const melodySeconds = melody.length * (NOTE_SECONDS + NOTE_GAP_SECONDS)
    let at = audio.currentTime + 0.05

    for (let repeat = 0; repeat < REPEATS; repeat += 1) {
      for (const [index, frequency] of melody.entries()) {
        playNote(
          audio,
          frequency,
          at + index * (NOTE_SECONDS + NOTE_GAP_SECONDS)
        )
      }
      at += melodySeconds + REPEAT_GAP_SECONDS
    }
  } catch {
    // No audio; the notification and the alert still show.
  }
}
