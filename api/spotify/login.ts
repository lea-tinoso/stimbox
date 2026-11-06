import { env, SCOPES } from '../_spotify.js'

// Step 1 of the one-time setup: lea opens /api/spotify/login and approves stimbox on Spotify.
export function GET(request: Request) {
  const origin = new URL(request.url).origin
  const state = crypto.randomUUID()
  const url = new URL('https://accounts.spotify.com/authorize')
  url.search = new URLSearchParams({
    response_type: 'code',
    client_id: env('SPOTIFY_CLIENT_ID'),
    scope: SCOPES,
    redirect_uri: `${origin}/api/spotify/callback`,
    state,
  }).toString()
  return new Response(null, {
    status: 302,
    headers: {
      Location: url.toString(),
      'Set-Cookie': `stimbox_state=${state}; Path=/; Max-Age=600; HttpOnly; Secure; SameSite=Lax`,
    },
  })
}
