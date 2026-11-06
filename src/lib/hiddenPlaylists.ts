import { useSyncExternalStore } from 'react'
import { load, save } from './storage.ts'

// Spotify playlists deleted from stimbox. They stay on Spotify; this browser just stops showing them.
let hidden: string[] = load<string[]>('hiddenPlaylists', [])
const subs = new Set<() => void>()

function set(next: string[]) {
  hidden = next
  save('hiddenPlaylists', hidden)
  subs.forEach((fn) => fn())
}

export const hiddenPlaylists = {
  // Returns an undo.
  hide(id: string) {
    set([...hidden.filter((x) => x !== id), id])
    return () => set(hidden.filter((x) => x !== id))
  },
}

export function useHiddenPlaylists() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    () => hidden,
  )
}
