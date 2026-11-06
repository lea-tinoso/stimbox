import { env, spotify } from './_spotify.js'
import type { Paged, SpotifyTrack } from './_tracks.js'

// Last.fm fills in what Spotify closed to new apps (similar songs, charts). Needs LASTFM_API_KEY.
export async function lastfm<T>(
  params: Record<string, string>,
): Promise<T | null> {
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

// Spotify search for songs, e.g. to find a song Last.fm named.
export const find = async (q: string, limit = 1, offset = 0) =>
  (
    await spotify<{ tracks: Paged<SpotifyTrack> }>(
      `/search?type=track&limit=${limit}&offset=${offset}&q=${encodeURIComponent(q)}`,
    )
  )?.tracks.items ?? []
