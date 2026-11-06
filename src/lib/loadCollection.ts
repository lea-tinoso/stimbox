import { toTrack } from '../data/catalog.ts'
import { registerTracks, type Art, type Collection } from '../data/fake.ts'
import type { OutResult, OutTrack } from '../data/spotify-types.ts'

// Loads the songs of a playlist, album or artist found on Spotify. null = Spotify won't share them.
export async function loadCollection(r: OutResult): Promise<Collection | null> {
  try {
    const res = await fetch(
      `/api/spotify/collection?kind=${r.kind}&id=${encodeURIComponent(r.id)}`,
    )
    const d = res.ok
      ? ((await res.json()) as { tracks: OutTrack[]; blocked?: boolean })
      : null
    if (!d || d.blocked || !d.tracks.length) return null
    const list = d.tracks.map(toTrack)
    registerTracks(list)
    return {
      id: `${r.kind}-${r.id}`,
      kind: r.kind,
      title: r.title.toLowerCase(),
      subtitle: r.subtitle.toLowerCase(),
      art: r.image.startsWith('https://') ? (r.image as Art) : 'art-6',
      trackIds: list.map((t) => t.id),
    }
  } catch {
    return null
  }
}
