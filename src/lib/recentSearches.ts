import { useSyncExternalStore } from 'react'
import { load, save } from './storage.ts'

// Recent searches, newest first, kept in this browser (like YouTube Music's search history).
const MAX = 8
let list: string[] = load<string[]>('searches', [])
const subs = new Set<() => void>()

function set(next: string[]) {
  list = next
  save('searches', list)
  subs.forEach((fn) => fn())
}

export const recentSearches = {
  add(q: string) {
    const clean = q.trim().toLowerCase()
    if (clean.length < 2) return
    set([clean, ...list.filter((x) => x !== clean)].slice(0, MAX))
  },
  remove(q: string) {
    set(list.filter((x) => x !== q))
  },
}

export function useRecentSearches() {
  return useSyncExternalStore(
    (fn) => {
      subs.add(fn)
      return () => subs.delete(fn)
    },
    () => list,
  )
}
