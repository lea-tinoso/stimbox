import type { HomeData } from './spotify-types.ts'
import {
  forYouPlaylists,
  forYouSongs,
  listenAgain,
  recentCollections,
  recentSongs,
  registerTracks,
  stats,
  trending,
  type Art,
  type Collection,
  type Range,
  type Stats,
  type Track,
} from './fake.ts'

// What the home screen shows. Starts as the demo data, then switches to lea's real Spotify music
// when /api/spotify/home answers (it only does on Vercel, once the Spotify env vars are set).

export type Catalog = {
  source: 'demo' | 'spotify'
  listenAgain: Collection[]
  recentSongs: { trackId: string; when: string }[]
  recentCollections: Collection[]
  forYouSongs: string[]
  forYouPlaylists: Collection[]
  // lea's own playlists on Spotify, for the library.
  spotifyPlaylists: Collection[]
  forYouNote: string
  trending: typeof trending
  stats: Record<Range, Stats>
  // The first songs to queue when nothing has been played yet.
  starter: string[]
}

export const DEMO: Catalog = {
  source: 'demo',
  listenAgain,
  recentSongs,
  recentCollections,
  forYouSongs,
  forYouPlaylists,
  spotifyPlaylists: [],
  forYouNote: 'because you played opm faves',
  trending,
  stats,
  starter: [],
}

const art = (url: string, fallback: Art): Art =>
  url.startsWith('https://') ? (url as Art) : fallback

export function toTrack(t: HomeData['tracks'][number]): Track {
  return {
    id: t.id,
    uri: t.uri,
    title: t.title.toLowerCase(),
    artist: t.artist.toLowerCase(),
    album: t.album.toLowerCase(),
    year: t.year,
    art: art(t.image, 'art-3'),
    duration: t.duration,
  }
}

function when(iso: string, now: number) {
  const t = new Date(iso)
  const mins = (now - t.getTime()) / 60000
  if (mins < 10) return 'now'
  if (mins < 60) return `${Math.round(mins)}m ago`
  if (mins < 60 * 6) return `${Math.round(mins / 60)}h ago`
  const today = new Date(now).toDateString()
  if (t.toDateString() === today) return 'today'
  if (mins < 60 * 48) return 'yesterday'
  if (mins < 60 * 24 * 7)
    return t.toLocaleDateString('en', { weekday: 'short' }).toLowerCase()
  return 'last week'
}

const hourLabel = (h: number) =>
  `${h % 12 || 12}${h < 12 ? 'am' : 'pm'}`.replace(/(am|pm)$/, ' $1')

function toStats(d: HomeData, range: Range): Stats {
  const top = d.top[range]
  // Genres, weighted by how high each artist ranks. New Spotify apps may get none.
  const weight = new Map<string, number>()
  top.artists.forEach((a, i) =>
    a.genres.forEach((g) =>
      weight.set(g, (weight.get(g) ?? 0) + top.artists.length - i),
    ),
  )
  const total = [...weight.values()].reduce((a, b) => a + b, 0)
  const genres = [...weight.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, w]) => ({ name, share: Math.round((w / total) * 100) }))

  // Listening by hour, from the last 50 plays (all Spotify shares).
  const buckets = Array<number>(12).fill(0)
  let seconds = 0
  const count = new Map<string, number>()
  for (const r of d.recent) {
    buckets[Math.floor(new Date(r.playedAt).getHours() / 2)]++
    count.set(r.trackId, (count.get(r.trackId) ?? 0) + 1)
  }
  for (const [id, n] of count)
    seconds += n * (d.tracks.find((t) => t.id === id)?.duration ?? 0)
  const most = Math.max(1, ...buckets)
  const peakAt = buckets.indexOf(most)
  const repeats = [...count.values()].reduce((a, n) => a + n - 1, 0)

  return {
    genres,
    hours: Math.round((seconds / 3600) * 10) / 10,
    hoursNote: `in your last ${d.recent.length} plays`,
    byHour: buckets.map((b) => Math.round((b / most) * 100)),
    peak: `${hourLabel(peakAt * 2)}–${hourLabel(peakAt * 2 + 2)}`,
    topArtists: top.artists.map((a) => ({
      name: a.name.toLowerCase(),
      art: art(a.image, 'art-4'),
    })),
    onRepeat: top.trackIds.slice(0, 3).map((trackId) => ({ trackId })),
    repeatShare: d.recent.length
      ? Math.round((repeats / d.recent.length) * 100)
      : 0,
  }
}

const toCollection = (c: HomeData['playlists'][number]): Collection => ({
  id: c.id,
  title: c.title.toLowerCase(),
  kind: c.kind,
  subtitle: c.subtitle.toLowerCase(),
  art: art(c.image, 'art-6'),
  trackIds: c.trackIds,
})

export function fromSpotify(d: HomeData): Catalog {
  registerTracks(d.tracks.map(toTrack))
  const now = Date.now()
  const albums = d.recentAlbums.map(toCollection)
  const playlists = d.playlists.map(toCollection)
  // Listen again: what she played lately (albums from recent plays), then her playlists.
  const mixed = [...albums.slice(0, 3), ...playlists.slice(0, 3)]
  const recentIds = new Set(d.recent.map((r) => r.trackId))
  const oldFaves = d.top['1y'].trackIds.filter((id) => !recentIds.has(id))
  return {
    source: 'spotify',
    listenAgain: mixed.length ? mixed : DEMO.listenAgain,
    recentSongs: d.recent.map((r) => ({
      trackId: r.trackId,
      when: when(r.playedAt, now),
    })),
    recentCollections: [...albums, ...playlists],
    forYouSongs: oldFaves.length
      ? oldFaves
      : d.liked.slice(0, 10).length
        ? d.liked.slice(0, 10)
        : DEMO.forYouSongs,
    forYouPlaylists: playlists.length ? playlists : DEMO.forYouPlaylists,
    spotifyPlaylists: playlists,
    forYouNote: oldFaves.length
      ? 'old favorites you haven’t played lately'
      : 'from your liked songs',
    trending,
    stats: {
      '4w': toStats(d, '4w'),
      '6m': toStats(d, '6m'),
      '1y': toStats(d, '1y'),
    },
    starter: d.recent
      .map((r) => r.trackId)
      .filter((id, i, a) => a.indexOf(id) === i)
      .slice(0, 12),
  }
}
