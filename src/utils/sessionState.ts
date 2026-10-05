import { useEffect, useState } from 'react'

/**
 * useState that survives navigating away and back within the session (e.g. home filters
 * after opening a plant). Storage can be unavailable in private mode, so every access is guarded.
 */
export function useSessionState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = sessionStorage.getItem(key)
      return stored ? { ...initial, ...JSON.parse(stored) } : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(value))
    } catch {
      // ignore
    }
  }, [key, value])

  return [value, setValue]
}
