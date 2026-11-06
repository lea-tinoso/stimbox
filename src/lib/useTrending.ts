import { toTrack } from '../data/catalog.ts'
import { registerTracks, type ChartEntry } from '../data/fake.ts'
import type { OutTrack } from '../data/spotify-types.ts'
import { useCatalog } from '../state/catalog.tsx'
import { load, save } from './storage.ts'
import { useJson } from './useJson.ts'

export type Region = 'ph' | 'asia' | 'world'

const register = (d: { tracks: OutTrack[] }) =>
  registerTracks(d.tracks.map(toTrack))

// The ▲▼ arrows compare today's chart with the last different day this browser saw it.
type Seen = { day: string; ids: string[]; prev: string[] | null }
function withMoves(region: Region, ids: string[]): ChartEntry[] {
  const day = new Date().toDateString()
  const key = `trending-${region}`
  const seen = load<Seen | null>(key, null)
  const prev = !seen ? null : seen.day === day ? seen.prev : seen.ids
  if (!seen || seen.day !== day || seen.ids.join() !== ids.join())
    save(key, { day, ids, prev })
  return ids.map((trackId, i) => {
    if (!prev) return { trackId, move: 0 }
    const was = prev.indexOf(trackId)
    return { trackId, move: was < 0 ? 'new' : was - i }
  })
}

// Real charts (Last.fm, found on Spotify) once the Spotify catalog is on; demo charts otherwise.
export function useTrending(region: Region) {
  const { source, trending } = useCatalog()
  const { data, loading } = useJson<{ tracks: OutTrack[] }>(
    source === 'spotify' ? `/api/spotify/trending?region=${region}` : null,
    false,
    register,
  )
  if (data?.tracks.length)
    return {
      entries: withMoves(
        region,
        data.tracks.map((t) => t.id),
      ),
      loading: false,
    }
  return { entries: loading ? [] : trending[region], loading }
}
