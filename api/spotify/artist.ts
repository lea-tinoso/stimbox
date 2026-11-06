import type { ArtistData, OutResult } from '../../src/data/spotify-types.ts'
import {
  CACHE,
  configured,
  env,
  isOwner,
  json,
  spotify,
  spotifyWrite,
} from '../_spotify.js'
import {
  pick,
  present,
  toOut,
  type Image,
  type Paged,
  type SpotifyTrack,
} from '../_tracks.js'

// An artist's page, found by name (songs only carry artist names). Spotify gives the music;
// its top tracks, follower counts and bios are closed to new apps, so songs come from search and
// listeners, bio and similar artists from Last.fm (LASTFM_API_KEY).
type Artist = { id: string; name: string; images?: Image[] }
type Album = {
  id: string
  name: string
  release_date?: string
  album_type?: string
  images?: Image[]
}

async function lastfmInfo(name: string) {
  const key = env('LASTFM_API_KEY')
  if (!key) return null
  const url = new URL('https://ws.audioscrobbler.com/2.0/')
  url.search = new URLSearchParams({
    method: 'artist.getinfo',
    artist: name,
    api_key: key,
    format: 'json',
    autocorrect: '1',
  }).toString()
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    return (await res.json()) as {
      artist?: {
        stats?: { listeners?: string }
        bio?: { summary?: string }
        similar?: { artist?: { name: string }[] }
      }
    }
  } catch {
    return null
  }
}

// Last.fm bios end with a "Read more on Last.fm" link; keep the text only.
const plain = (html = '') =>
  html
    .replace(/<a [^>]*>.*?<\/a>\.?/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .trim()

// Spotify renamed some follow endpoints in 2026, so try the old one, then the library one.
async function isFollowing(id: string) {
  const old = await spotify<boolean[]>(
    `/me/following/contains?type=artist&ids=${id}`,
  )
  if (old) return old[0] ?? false
  const lib = await spotify<boolean[]>(
    `/me/library/contains?uris=spotify:artist:${id}`,
  )
  return lib ? (lib[0] ?? false) : null
}

export async function GET(request: Request) {
  if (!configured()) return json({ error: 'not configured' }, { status: 503 })
  const name = new URL(request.url).searchParams
    .get('name')
    ?.trim()
    .slice(0, 100)
  if (!name) return json({ error: 'need name' }, { status: 400 })

  const found = await spotify<{ artists: Paged<Artist> }>(
    `/search?type=artist&limit=5&q=${encodeURIComponent(name)}`,
  )
  const list = found?.artists.items ?? []
  const artist =
    list.find((a) => a.name.toLowerCase() === name.toLowerCase()) ?? list[0]
  if (!artist) return json({ error: 'not found' }, { status: 404 })

  const [songs, albums, info] = await Promise.all([
    spotify<{ tracks: Paged<SpotifyTrack> }>(
      `/search?type=track&limit=10&q=${encodeURIComponent(`artist:"${artist.name}"`)}`,
    ),
    spotify<Paged<Album>>(
      `/artists/${artist.id}/albums?include_groups=album,single&limit=10`,
    ),
    lastfmInfo(artist.name),
  ])
  const data: ArtistData = {
    id: artist.id,
    name: artist.name,
    image: pick(artist.images),
    url: `https://open.spotify.com/artist/${artist.id}`,
    // Search finds songs where they're only featured too; keep the ones that are theirs first.
    songs: present((songs?.tracks.items ?? []).map((t) => toOut(t))).sort(
      (a, b) =>
        Number(!a.artist.startsWith(artist.name)) -
        Number(!b.artist.startsWith(artist.name)),
    ),
    albums: (albums?.items ?? []).map((al): OutResult => ({
      id: al.id,
      kind: 'album',
      title: al.name,
      subtitle: `${al.album_type ?? 'album'} · ${al.release_date?.slice(0, 4) ?? ''}`,
      image: pick(al.images),
    })),
    listeners: Number(info?.artist?.stats?.listeners) || null,
    bio: plain(info?.artist?.bio?.summary),
    similar: (info?.artist?.similar?.artist ?? [])
      .map((a) => a.name)
      .slice(0, 5),
    // Only lea's browser learns whether she follows them.
    following: isOwner(request) ? await isFollowing(artist.id) : null,
  }
  return json(data, {
    headers: isOwner(request) ? { 'Cache-Control': 'no-store' } : CACHE,
  })
}

// Follow (PUT) or unfollow (DELETE), for lea only.
async function follow(request: Request, method: 'PUT' | 'DELETE') {
  if (!configured() || !isOwner(request))
    return json({ error: 'not allowed' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!/^[A-Za-z0-9]{1,40}$/.test(id))
    return json({ error: 'bad id' }, { status: 400 })
  const ok =
    (await spotifyWrite(method, `/me/following?type=artist&ids=${id}`)) ||
    (await spotifyWrite(method, `/me/library?uris=spotify:artist:${id}`))
  return json({ ok }, { status: ok ? 200 : 502 })
}
export const PUT = (request: Request) => follow(request, 'PUT')
export const DELETE = (request: Request) => follow(request, 'DELETE')
