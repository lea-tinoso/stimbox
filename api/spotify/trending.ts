import { find, lastfm } from '../_lastfm.js'
import { configured, env, json, NO_STORE } from '../_spotify.js'
import { present, toOut } from '../_tracks.js'

// Trending songs. Spotify has no charts API and new apps can't open its Top 50 playlists, so
// Last.fm's charts say what's trending and Spotify search finds each song.
// ph = the Philippines, world = Last.fm's global chart, asia = several Asian countries' charts
// blended (a song high up in more countries ranks higher).
type Top = { name: string; artist: { name: string } }

const ASIA = [
  'Philippines',
  'Japan',
  'Korea, Republic of',
  'Indonesia',
  'Thailand',
  'Malaysia',
  'Viet Nam',
  'Taiwan',
  'Singapore',
  'India',
]

const country = async (name: string, limit: number) =>
  (
    await lastfm<{ tracks?: { track?: Top[] } }>({
      method: 'geo.gettoptracks',
      country: name,
      limit: String(limit),
    })
  )?.tracks?.track ?? []

async function chart(region: string): Promise<Top[]> {
  if (region === 'ph') return country('Philippines', 20)
  if (region === 'world')
    return (
      (
        await lastfm<{ tracks?: { track?: Top[] } }>({
          method: 'chart.gettoptracks',
          limit: '20',
        })
      )?.tracks?.track ?? []
    )
  const lists = await Promise.all(ASIA.map((c) => country(c, 25)))
  const score = new Map<string, { t: Top; s: number }>()
  for (const list of lists)
    list.forEach((t, i) => {
      const key = `${t.name}|${t.artist.name}`.toLowerCase()
      const hit = score.get(key) ?? { t, s: 0 }
      hit.s += 25 - i
      score.set(key, hit)
    })
  return [...score.values()]
    .sort((a, b) => b.s - a.s)
    .slice(0, 20)
    .map((x) => x.t)
}

export async function GET(request: Request) {
  if (!configured() || !env('LASTFM_API_KEY'))
    return json({ error: 'not configured' }, { status: 503 })
  const region = new URL(request.url).searchParams.get('region') ?? 'ph'
  if (!['ph', 'asia', 'world'].includes(region))
    return json({ error: 'region is ph, asia or world' }, { status: 400 })
  const top = await chart(region)
  const tracks = present(
    (
      await Promise.all(
        top.map((t) =>
          find(`track:"${t.name}" artist:"${t.artist.name}"`).then((r) => r[0]),
        ),
      )
    ).map((t) => toOut(t)),
  ).filter((t, i, a) => a.findIndex((x) => x.id === t.id) === i)
  // Spotify search failed (quota): don't keep an empty chart for hours.
  if (!tracks.length)
    return json(
      { tracks, error: 'spotify unavailable' },
      { status: 502, headers: NO_STORE },
    )
  // Charts move slowly: ask Last.fm at most every few hours.
  return json(
    { tracks },
    {
      headers: {
        'Cache-Control':
          'public, s-maxage=43200, stale-while-revalidate=172800',
      },
    },
  )
}
