import { useEffect, useState } from 'react'
import { toTrack } from '../data/catalog.ts'
import { registerTracks, tracks, type Collection } from '../data/fake.ts'
import type { OutResult, SearchData } from '../data/spotify-types.ts'
import { useCatalog } from '../state/catalog.tsx'

type Found = {
  q: string
  ids: string[]
  playlists: OutResult[]
  albums: OutResult[]
  artists: OutResult[]
}
const none = { ids: [], playlists: [], albums: [], artists: [] }

// Spotify search once the real catalog is on, demo search otherwise. Waits for a pause in typing.
export function useSearch(q: string) {
  const { source, recentCollections, forYouPlaylists } = useCatalog()
  const [found, setFound] = useState<Found>({ q: '', ...none })
  useEffect(() => {
    // Each search spends Spotify's small search quota, so wait for 2+ letters and a real pause.
    if (source !== 'spotify' || q.trim().length < 2) return
    const ctl = new AbortController()
    const id = window.setTimeout(() => {
      fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, {
        signal: ctl.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<SearchData>) : null))
        .then((d) => {
          if (!d) return
          const list = d.tracks.map(toTrack)
          registerTracks(list)
          setFound({
            q,
            ids: list.map((t) => t.id),
            playlists: d.playlists ?? [],
            albums: d.albums ?? [],
            artists: d.artists ?? [],
          })
        })
        .catch(() => {})
    }, 700)
    return () => {
      ctl.abort()
      window.clearTimeout(id)
    }
  }, [q, source])
  if (!q) return { ...none, loading: false }
  if (source === 'spotify')
    return found.q === q
      ? { ...found, loading: false }
      : { ...none, loading: true }
  const has = (text: string) => text.toLowerCase().includes(q)
  const collections = [...recentCollections, ...forYouPlaylists].filter(
    (c, i, a) => a.findIndex((x) => x.id === c.id) === i && has(c.title),
  )
  const asResult = (c: Collection): OutResult => ({
    id: c.id,
    kind: c.kind,
    title: c.title,
    subtitle: c.subtitle,
    image: '',
  })
  return {
    ids: tracks
      .filter((t) => has(`${t.title} ${t.artist} ${t.album}`))
      .map((t) => t.id),
    playlists: collections.filter((c) => c.kind === 'playlist').map(asResult),
    albums: collections.filter((c) => c.kind === 'album').map(asResult),
    artists: [],
    loading: false,
    demo: collections,
  }
}
