import { CACHE, configured, env, json, spotify } from '../_spotify.js'
import type { OutTrack } from '../../src/data/spotify-types.ts'
import { present, toOut, type Paged, type SpotifyTrack } from '../_tracks.js'

// "Keep playing similar songs" after a song picked from search, like YouTube Music's radio.
// Spotify closed recommendations to new apps, so Last.fm says what's similar (needs the
// LASTFM_API_KEY env var) and Spotify search finds each song. Without a key, or when Last.fm
// knows nothing, it falls back to more songs by the same artist.
type Similar = { name: string; artist: { name: string } }

async function lastfm<T>(params: Record<string, string>): Promise<T | null> {
  const key = env('LASTFM_API_KEY')
  if (!key) return null
  const url = new URL('https://ws.audioscrobbler.com/2.0/')
  for (const [k, v] of Object.entries({
    ...params,
    api_key: key,
    format: 'json',
    autocorrect: '1',
  }))
    url.searchParams.set(k, v)
  try {
    const res = await fetch(url)
    return res.ok ? ((await res.json()) as T) : null
  } catch {
    return null
  }
}

const find = async (q: string, limit = 1, offset = 0) =>
  (
    await spotify<{ tracks: Paged<SpotifyTrack> }>(
      `/search?type=track&limit=${limit}&offset=${offset}&q=${encodeURIComponent(q)}`,
    )
  )?.tracks.items ?? []

export async function GET(request: Request) {
  if (!configured()) return json({ error: 'not configured' }, { status: 503 })
  const params = new URL(request.url).searchParams
  const track = params.get('track')?.slice(0, 100) ?? ''
  const artist = params.get('artist')?.split(',')[0].trim().slice(0, 100) ?? ''
  const page = Math.min(4, Math.max(0, Number(params.get('page')) || 0))
  if (!track || !artist)
    return json({ error: 'need track and artist' }, { status: 400 })

  // Similar songs from Last.fm, 15 per page.
  const similar = await lastfm<{ similartracks?: { track?: Similar[] } }>({
    method: 'track.getsimilar',
    track,
    artist,
    limit: '75',
  })
  const picks = (similar?.similartracks?.track ?? []).slice(
    page * 15,
    page * 15 + 15,
  )
  const fromSimilar = present(
    (
      await Promise.all(
        picks.map((s) =>
          find(`track:"${s.name}" artist:"${s.artist.name}"`).then((r) => r[0]),
        ),
      )
    ).map((t) => toOut(t)),
  )

  // Niche songs often have few similar songs on Last.fm, so mix in a few songs each from
  // similar artists, 5 artists per page.
  let fromArtists: OutTrack[] = []
  if (fromSimilar.length < 12) {
    const like = await lastfm<{
      similarartists?: { artist?: { name: string }[] }
    }>({
      method: 'artist.getsimilar',
      artist,
      limit: '25',
    })
    const names = (like?.similarartists?.artist ?? [])
      .slice(page * 5, page * 5 + 5)
      .map((a) => a.name)
    const lists = await Promise.all(
      names.map((n) =>
        find(`artist:"${n}"`, 3).then((r) => present(r.map((t) => toOut(t)))),
      ),
    )
    // one from each artist in turn, so it doesn't play three in a row from one
    for (let k = 0; k < 3; k++)
      for (const l of lists) if (l[k]) fromArtists.push(l[k])
  }

  // A couple from the same artist, for the familiar feel.
  const own = present(
    (await find(`artist:"${artist}"`, 3, page * 3)).map((t) => toOut(t)),
  )

  // Interleave: similar songs, songs by similar artists, then the artist's own.
  const found: OutTrack[] = []
  const seen = new Set<string>()
  const push = (t: OutTrack | undefined) => {
    if (t && !seen.has(t.id)) {
      seen.add(t.id)
      found.push(t)
    }
  }
  const longest = Math.max(fromSimilar.length, fromArtists.length)
  for (let k = 0; k < longest; k++) {
    push(fromSimilar[k])
    push(fromArtists[k])
    if (k % 4 === 3) push(own.shift())
  }
  own.forEach(push)
  const source =
    fromSimilar.length || fromArtists.length ? 'lastfm' : 'artist only'
  return json({ tracks: found, source }, { headers: CACHE })
}
