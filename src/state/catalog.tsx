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
import { useSpotifyAdds } from '../lib/spotifyAdds.ts'

// Starts as the demo data, then switches to lea's real Spotify music when /api/spotify/home
// answers (it only does on Vercel, once the Spotify env vars are set).
const CatalogContext = createContext<Catalog>(DEMO)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<HomeData | null>(null)
  useEffect(() => {
    const ctl = new AbortController()
    let timer = 0
    // If Spotify hiccups, try again a few times before settling for the demo data.
    const load = (tries: number) =>
      fetch('/api/spotify/home', { signal: ctl.signal })
        .then((r) => (r.ok ? (r.json() as Promise<HomeData>) : null))
        .then((d) => {
          if (d && Array.isArray(d.tracks) && d.tracks.length) setData(d)
          else if (tries > 0)
            timer = window.setTimeout(() => void load(tries - 1), 4000)
        })
        .catch(() => {
          // offline, local dev or not set up yet: keep the demo data
        })
    void load(3)
    return () => {
      ctl.abort()
      window.clearTimeout(timer)
    }
  }, [])
  const hidden = useHiddenPlaylists()
  const adds = useSpotifyAdds()
  const full = useMemo(() => (data ? fromSpotify(data) : DEMO), [data])
  // Playlists deleted from stimbox disappear everywhere they'd show.
  const value = useMemo(() => {
    if (!hidden.length && !Object.keys(adds).length) return full
    const keep = <T extends { id: string; trackIds: string[] }>(list: T[]) =>
      list
        .filter((c) => !hidden.includes(c.id))
        .map((c) =>
          adds[c.id]?.some((id) => !c.trackIds.includes(id))
            ? {
                ...c,
                trackIds: [
                  ...c.trackIds,
                  ...adds[c.id].filter((id) => !c.trackIds.includes(id)),
                ],
              }
            : c,
        )
    return {
      ...full,
      listenAgain: keep(full.listenAgain),
      recentCollections: keep(full.recentCollections),
      forYouPlaylists: keep(full.forYouPlaylists),
      spotifyPlaylists: keep(full.spotifyPlaylists),
    }
  }, [full, hidden, adds])
  return <CatalogContext value={value}>{children}</CatalogContext>
}

export function useCatalog() {
  return use(CatalogContext)
}
