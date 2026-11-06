import type { OutTrack } from '../../src/data/spotify-types.ts'
import { CACHE, configured, json, spotify } from '../_spotify.js'
import {
  present,
  toOut,
  type Image,
  type Paged,
  type SpotifyTrack,
} from '../_tracks.js'

// The songs of a playlist, album or artist found in search, fetched when it's opened.
// Spotify only lets new apps read playlists lea owns or follows, so others come back "blocked".
export async function GET(request: Request) {
  if (!configured()) return json({ error: 'not configured' }, { status: 503 })
  const params = new URL(request.url).searchParams
  const kind = params.get('kind')
  const id = params.get('id') ?? ''
  if (!/^[A-Za-z0-9]{1,40}$/.test(id))
    return json({ error: 'bad id' }, { status: 400 })

  let tracks: OutTrack[] | null = null
  if (kind === 'album') {
    const al = await spotify<{
      id: string
      name: string
      release_date?: string
      images?: Image[]
      tracks: Paged<SpotifyTrack>
    }>(`/albums/${id}`)
    if (al) tracks = present(al.tracks.items.map((t) => toOut(t, al)))
  } else if (kind === 'playlist') {
    type Entry = { track?: SpotifyTrack | null; item?: SpotifyTrack | null }
    const res =
      (await spotify<Paged<Entry>>(`/playlists/${id}/items?limit=50`)) ??
      (await spotify<Paged<Entry>>(`/playlists/${id}/tracks?limit=50`))
    if (res) tracks = present(res.items.map((e) => toOut(e.item ?? e.track)))
  } else if (kind === 'artist') {
    // Artist top tracks are closed to new apps, so search for their songs instead.
    const artist = await spotify<{ name: string }>(`/artists/${id}`)
    if (artist) {
      const res = await spotify<{ tracks: Paged<SpotifyTrack> }>(
        `/search?type=track&limit=10&q=${encodeURIComponent(`artist:"${artist.name}"`)}`,
      )
      tracks = present((res?.tracks.items ?? []).map((t) => toOut(t)))
    }
  } else return json({ error: 'bad kind' }, { status: 400 })

  if (!tracks?.length) return json({ tracks: [], blocked: true })
  return json({ tracks }, { headers: CACHE })
}
