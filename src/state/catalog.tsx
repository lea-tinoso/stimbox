import {
  createContext,
  use,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { DEMO, fromSpotify, type Catalog } from '../data/catalog.ts'
import type { HomeData } from '../data/spotify-types.ts'
import { useHiddenPlaylists } from '../lib/hiddenPlaylists.ts'

// Starts as the demo data, then switches to lea's real Spotify music when /api/spotify/home
// answers (it only does on Vercel, once the Spotify env vars are set).
const CatalogContext = createContext<Catalog>(DEMO)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HomeData | null>(null)
  useEffect(() => {
    const ctl = new AbortController()
    fetch('/api/spotify/home', { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<HomeData>) : null))
      .then((d) => d && Array.isArray(d.tracks) && setData(d))
      .catch(() => {
        // offline, local dev or not set up yet: keep the demo data
      })
    return () => ctl.abort()
  }, [])
  const hidden = useHiddenPlaylists()
  const full = useMemo(() => (data ? fromSpotify(data) : DEMO), [data])
  // Playlists deleted from stimbox disappear everywhere they'd show.
  const value = useMemo(() => {
    if (!hidden.length) return full
    const keep = <T extends { id: string }>(list: T[]) =>
      list.filter((c) => !hidden.includes(c.id))
    return {
      ...full,
      listenAgain: keep(full.listenAgain),
      recentCollections: keep(full.recentCollections),
      forYouPlaylists: keep(full.forYouPlaylists),
      spotifyPlaylists: keep(full.spotifyPlaylists),
    }
  }, [full, hidden])
  return <CatalogContext value={value}>{children}</CatalogContext>
}

export function useCatalog() {
  return use(CatalogContext)
}
