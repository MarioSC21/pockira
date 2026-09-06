import * as React from "react"

interface UseControllableStateParams<T> {
  prop?: T
  defaultProp?: T
  onChange?: (value: T) => void
}

export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>) {
  const [uncontrolledProp, setUncontrolledProp] = React.useState(defaultProp)
  const isControlled = prop !== undefined
  const value = isControlled ? prop : uncontrolledProp

  const setValue = React.useCallback(
    (nextValue: T | ((prevValue: T | undefined) => T)) => {
      const resolvedValue =
        typeof nextValue === "function"
          ? (nextValue as (prevValue: T | undefined) => T)(value)
          : nextValue

      if (!isControlled) {
        setUncontrolledProp(resolvedValue)
      }
      onChange?.(resolvedValue)
    },
    [isControlled, onChange, value]
  )

  return [value, setValue] as const
}
