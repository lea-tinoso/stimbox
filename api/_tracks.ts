import type { OutTrack } from '../src/data/spotify-types.ts'

// Spotify's track shape, and turning it into the one the app uses. Shared by the routes.

export type Image = { url: string; width?: number | null }
export type SpotifyTrack = {
  id: string | null
  uri: string
  name: string
  duration_ms: number
  artists: { name: string }[]
  album?: { id: string; name: string; release_date?: string; images?: Image[] }
}
export type Paged<T> = { items: T[] }

// Spotify lists images largest first. Take one near 300px for crisp art at 2x.
export const pick = (images: Image[] | null = []) =>
  (images?.find((i) => (i.width ?? 0) <= 320) ?? images?.[0])?.url ?? ''

export function toOut(
  t: SpotifyTrack | null | undefined,
  album?: SpotifyTrack['album'],
): OutTrack | null {
  if (!t?.id) return null
  const al = t.album ?? album
  return {
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: al?.name ?? '',
    year: Number(al?.release_date?.slice(0, 4)) || 0,
    image: pick(al?.images),
    duration: Math.round(t.duration_ms / 1000),
    albumId: al?.id,
  }
}

export const present = <T>(list: (T | null | undefined)[]) =>
  list.filter((x): x is T => x != null)
