import { CACHE, configured, json, spotify } from '../_spotify.js'

// Song search for the menu bar search box. New Spotify apps get at most 10 results.
type Image = { url: string; width?: number | null }
type Track = {
  id: string
  uri: string
  name: string
  duration_ms: number
  artists: { name: string }[]
  album: { name: string; release_date?: string; images?: Image[] }
}

export async function GET(request: Request) {
  if (!configured()) return json({ error: 'not configured' }, { status: 503 })
  const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100)
  if (!q) return json({ tracks: [] })
  const res = await spotify<{ tracks: { items: Track[] } }>(
    `/search?type=track&limit=10&q=${encodeURIComponent(q)}`,
  )
  const tracks = (res?.tracks.items ?? []).map((t) => ({
    id: t.id,
    uri: t.uri,
    title: t.name,
    artist: t.artists.map((a) => a.name).join(', '),
    album: t.album.name,
    year: Number(t.album.release_date?.slice(0, 4)) || 0,
    image:
      (
        t.album.images?.find((i) => (i.width ?? 0) <= 320) ??
        t.album.images?.[0]
      )?.url ?? '',
    duration: Math.round(t.duration_ms / 1000),
  }))
  return json({ tracks }, { headers: CACHE })
}
