import { useSyncExternalStore } from 'react'
import { load, save } from './storage.ts'

// Songs lea added to her Spotify playlists from stimbox, shown right away while the server's
// cached copy catches up. Keyed by collection id.
type Adds = Record<string, string[]>
let adds: Adds = load<Adds>('spotifyAdds', {})
const subs = new Set<() => void>()

function set(next: Adds) {
  adds = next
  save('spotifyAdds', adds)
  subs.forEach((fn) => fn())
}

export const spotifyAdds = {
  // Returns an undo, for when Spotify says no.
  add(collectionId: string, trackId: string) {
    const list = adds[collectionId] ?? []
    if (!list.includes(trackId))
      set({ ...adds, [collectionId]: [...list, trackId] })
    return () =>
      set({
        ...adds,
        [collectionId]: (adds[collectionId] ?? []).filter((x) => x !== trackId),
      })
  },
}

export function useSpotifyAdds() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    () => adds,
  )
}
