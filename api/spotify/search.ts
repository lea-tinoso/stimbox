import type { OutResult } from '../../src/data/spotify-types.ts'
import { CACHE, configured, json, spotify } from '../_spotify.js'
import {
  pick,
  present,
  toOut,
  type Image,
  type Paged,
  type SpotifyTrack,
} from '../_tracks.js'

// Search for the menu bar search box: songs, playlists, albums and artists, like Spotify's own.
// New Spotify apps get at most 10 results of each kind per call.
type Named = {
  id: string
  name: string
  images?: Image[] | null
  owner?: { display_name?: string }
  artists?: { name: string }[]
  release_date?: string
}

export async function GET(request: Request) {
  if (!configured()) return json({ error: 'not configured' }, { status: 503 })
  const q = new URL(request.url).searchParams.get('q')?.trim().slice(0, 100)
  const empty = { tracks: [], playlists: [], albums: [], artists: [] }
  if (!q) return json(empty)
  const res = await spotify<{
    tracks?: Paged<SpotifyTrack | null>
    playlists?: Paged<Named | null>
    albums?: Paged<Named | null>
    artists?: Paged<Named | null>
  }>(
    `/search?type=track,playlist,album,artist&limit=10&q=${encodeURIComponent(q)}`,
  )
  if (!res) return json(empty)
  // New apps get 10 per call, so fetch two more pages of songs.
  const more = await Promise.all(
    [10, 20].map((offset) =>
      spotify<{ tracks?: Paged<SpotifyTrack | null> }>(
        `/search?type=track&limit=10&offset=${offset}&q=${encodeURIComponent(q)}`,
      ),
    ),
  )
  const results = (
    kind: OutResult['kind'],
    list: (Named | null)[] = [],
    subtitle: (n: Named) => string,
  ): OutResult[] =>
    present(list).map((n) => ({
      id: n.id,
      kind,
      title: n.name,
      subtitle: subtitle(n),
      image: pick(n.images),
    }))
  return json(
    {
      tracks: present(
        [res, ...more]
          .flatMap((r) => r?.tracks?.items ?? [])
          .map((t) => toOut(t)),
      ).filter((t, i, all) => all.findIndex((x) => x.id === t.id) === i),
      playlists: results('playlist', res.playlists?.items, (n) =>
        n.owner?.display_name
          ? `playlist · ${n.owner.display_name}`
          : 'playlist',
      ),
      albums: results(
        'album',
        res.albums?.items,
        (n) => `album · ${n.artists?.map((a) => a.name).join(', ') ?? ''}`,
      ),
      artists: results('artist', res.artists?.items, () => 'artist'),
    },
    { headers: CACHE },
  )
}
