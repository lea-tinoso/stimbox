import type { HomeData, OutTrack } from '../../src/data/spotify-types.ts'
import { CACHE, configured, json, spotify } from '../_spotify.js'
import {
  pick,
  toOut,
  type Image,
  type Paged,
  type SpotifyTrack,
} from '../_tracks.js'

// Everything the desktop shows, in one cached call: lea's recent plays, playlists, top artists and
// tracks per time range, and liked songs. The app falls back to its demo data when this fails.

export async function GET() {
  if (!configured()) return json({ error: 'not configured' }, { status: 503 })

  const tracks = new Map<string, OutTrack>()
  const add = (
    t: SpotifyTrack | null | undefined,
    album?: SpotifyTrack['album'],
  ) => {
    const out = toOut(t, album)
    if (!out) return null
    if (!tracks.has(out.id)) tracks.set(out.id, out)
    return out.id
  }
  const ids = (list: (string | null)[]) => list.filter((x): x is string => !!x)

  const ranges = {
    '4w': 'short_term',
    '6m': 'medium_term',
    '1y': 'long_term',
  } as const
  const [me, recentRes, playlistsRes, likedRes, ...topRes] = await Promise.all([
    spotify<{ id: string }>('/me'),
    spotify<Paged<{ track: SpotifyTrack; played_at: string }>>(
      '/me/player/recently-played?limit=50',
    ),
    spotify<
      Paged<{
        id: string
        name: string
        images: Image[] | null
        owner?: { id?: string; display_name?: string }
      }>
    >('/me/playlists?limit=20'),
    spotify<Paged<{ track: SpotifyTrack }>>('/me/tracks?limit=50'),
    ...Object.values(ranges).flatMap((r) => [
      spotify<Paged<{ name: string; images?: Image[]; genres?: string[] }>>(
        `/me/top/artists?time_range=${r}&limit=5`,
      ),
      spotify<Paged<SpotifyTrack>>(`/me/top/tracks?time_range=${r}&limit=10`),
    ]),
  ])

  const recent = (recentRes?.items ?? []).flatMap((i) => {
    const id = add(i.track)
    return id ? [{ trackId: id, playedAt: i.played_at }] : []
  })
  const liked = ids((likedRes?.items ?? []).map((i) => add(i.track)))

  // Playlist songs. Spotify renamed /tracks to /items in 2026, so try both.
  const playlists = await Promise.all(
    (playlistsRes?.items ?? []).slice(0, 20).map(async (p) => {
      type Entry = { track?: SpotifyTrack; item?: SpotifyTrack }
      const res =
        (await spotify<Paged<Entry>>(`/playlists/${p.id}/items?limit=40`)) ??
        (await spotify<Paged<Entry>>(`/playlists/${p.id}/tracks?limit=40`))
      return {
        id: `pl-${p.id}`,
        title: p.name,
        kind: 'playlist' as const,
        subtitle: 'playlist',
        image: pick(p.images ?? []),
        trackIds: ids((res?.items ?? []).map((e) => add(e.item ?? e.track))),
        owned: !!me && p.owner?.id === me.id,
      }
    }),
  )

  // Albums lea played lately, newest first.
  const albumsSeen = new Map<
    string,
    NonNullable<SpotifyTrack['album']> & { artist: string }
  >()
  for (const i of recentRes?.items ?? [])
    if (i.track.album && !albumsSeen.has(i.track.album.id))
      albumsSeen.set(i.track.album.id, {
        ...i.track.album,
        artist: i.track.artists[0]?.name ?? '',
      })
  const recentAlbums = await Promise.all(
    [...albumsSeen.values()].slice(0, 6).map(async (al) => {
      const res = await spotify<Paged<SpotifyTrack>>(
        `/albums/${al.id}/tracks?limit=30`,
      )
      return {
        id: `al-${al.id}`,
        title: al.name,
        kind: 'album' as const,
        subtitle: `album · ${al.artist}`,
        image: pick(al.images),
        trackIds: ids((res?.items ?? []).map((t) => add(t, al))),
      }
    }),
  )

  const top = Object.fromEntries(
    Object.keys(ranges).map((key, n) => {
      const artists = topRes[n * 2] as Paged<{
        name: string
        images?: Image[]
        genres?: string[]
      }> | null
      const songs = topRes[n * 2 + 1] as Paged<SpotifyTrack> | null
      return [
        key,
        {
          artists: (artists?.items ?? []).map((a) => ({
            name: a.name,
            image: pick(a.images),
            genres: a.genres ?? [],
          })),
          trackIds: ids((songs?.items ?? []).map((t) => add(t))),
        },
      ]
    }),
  ) as HomeData['top']

  const data: HomeData = {
    tracks: [...tracks.values()],
    recent,
    playlists: playlists.filter((p) => p.trackIds.length > 0 || p.owned),
    recentAlbums: recentAlbums.filter((a) => a.trackIds.length > 0),
    liked,
    top,
  }
  return json(data, { headers: CACHE })
}
