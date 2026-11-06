import { CACHE, configured, env, json, spotify } from '../_spotify.js'
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
  let found = present(
    (
      await Promise.all(
        picks.map((s) =>
          find(`track:"${s.name}" artist:"${s.artist.name}"`).then((r) => r[0]),
        ),
      )
    ).map((t) => toOut(t)),
  )
  let source = 'lastfm'
  if (found.length < 3) {
    // Same artist, a different page each time.
    found = present(
      (await find(`artist:"${artist}"`, 10, page * 10)).map((t) => toOut(t)),
    )
    source = 'artist'
  }
  return json({ tracks: found, source }, { headers: CACHE })
}
