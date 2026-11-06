import { configured, isOwner, json, spotifyWrite } from '../_spotify.js'

// Changes to lea's Spotify playlists, for lea only (see isOwner).
// GET: is this browser lea's? POST {playlist, uri}: add a song. DELETE ?id=: delete (unfollow) a
// playlist. PUT ?id=: undo that delete (follow it again).
const ID = /^[A-Za-z0-9]{1,40}$/
const URI = /^spotify:track:[A-Za-z0-9]{1,40}$/
const noStore = { 'Cache-Control': 'no-store' }

export function GET(request: Request) {
  return json({ owner: configured() && isOwner(request) }, { headers: noStore })
}

export async function POST(request: Request) {
  if (!configured() || !isOwner(request))
    return json({ error: 'not allowed' }, { status: 403 })
  const body = (await request.json().catch(() => null)) as {
    playlist?: string
    uri?: string
  } | null
  const playlist = body?.playlist ?? ''
  const uri = body?.uri ?? ''
  if (!ID.test(playlist) || !URI.test(uri))
    return json({ error: 'bad request' }, { status: 400 })
  // Spotify renamed /tracks to /items in 2026, so try both.
  const ok =
    (await spotifyWrite('POST', `/playlists/${playlist}/items`, {
      uris: [uri],
    })) ||
    (await spotifyWrite('POST', `/playlists/${playlist}/tracks`, {
      uris: [uri],
    }))
  return json({ ok }, { status: ok ? 200 : 502, headers: noStore })
}

async function follow(request: Request, method: 'PUT' | 'DELETE') {
  if (!configured() || !isOwner(request))
    return json({ error: 'not allowed' }, { status: 403 })
  const id = new URL(request.url).searchParams.get('id') ?? ''
  if (!ID.test(id)) return json({ error: 'bad id' }, { status: 400 })
  const ok = await spotifyWrite(method, `/playlists/${id}/followers`)
  return json({ ok }, { status: ok ? 200 : 502, headers: noStore })
}

export const DELETE = (request: Request) => follow(request, 'DELETE')
export const PUT = (request: Request) => follow(request, 'PUT')
