import { useSyncExternalStore } from 'react'

export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

// Phone layout is planned for later; below this width windows stack and stop dragging.
export const useCompact = () => useMedia('(max-width: 900px)')

// Phones: the whole app becomes one iPod that fills the screen.
export const usePhone = () => useMedia('(max-width: 640px)')
