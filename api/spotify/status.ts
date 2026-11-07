import { configured, env, json, tokenRequest } from '../_spotify.js'

// A check-up for the Spotify connection: open /api/spotify/status to see why stimbox shows demo
// music. It says which env vars this deployment has (yes/no, never their values), whether Spotify
// accepts the refresh token, and whether the account can be read.
export async function GET() {
  const has = (name: string) => Boolean(env(name))
  const vars = {
    SPOTIFY_CLIENT_ID: has('SPOTIFY_CLIENT_ID'),
    SPOTIFY_CLIENT_SECRET: has('SPOTIFY_CLIENT_SECRET'),
    SPOTIFY_REFRESH_TOKEN: has('SPOTIFY_REFRESH_TOKEN'),
    LASTFM_API_KEY: has('LASTFM_API_KEY'),
    STIMBOX_OWNER_KEY: env('STIMBOX_OWNER_KEY').length >= 12,
  }
  const report: Record<string, unknown> = {
    deployment: env('VERCEL_ENV') || 'unknown',
    envVars: vars,
  }
  const send = (verdict: string) =>
    json({ verdict, ...report }, { headers: { 'Cache-Control': 'no-store' } })

  if (!configured())
    return send(
      'missing env vars on this deployment: add the ones marked false for this environment in Vercel, then redeploy',
    )

  let token: string
  try {
    const t = await tokenRequest({
      grant_type: 'refresh_token',
      refresh_token: env('SPOTIFY_REFRESH_TOKEN'),
    })
    token = t.access_token
    report.token = 'ok'
  } catch (e) {
    const text = String(e)
    report.token = text
    if (text.includes('invalid_client'))
      return send(
        'spotify rejects the client id or secret: copy both again from the spotify dashboard into Vercel, then redeploy',
      )
    if (text.includes('invalid_grant'))
      return send(
        'spotify rejects the refresh token (revoked, mistyped, or made with another client id): open /api/spotify/login, put the new token in SPOTIFY_REFRESH_TOKEN, then redeploy',
      )
    return send('spotify token request failed: see token below')
  }

  const me = await fetch('https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${token}` },
  })
  report.account = me.ok
    ? {
        ok: true,
        name: ((await me.json()) as { display_name?: string }).display_name,
      }
    : { ok: false, status: me.status, body: (await me.text()).slice(0, 300) }
  if (!me.ok)
    return send(
      me.status === 403
        ? 'spotify refuses to read the account: the app owner needs an active Premium plan, and the account must be listed under User Management in the spotify dashboard'
        : 'spotify could not read the account: see account below',
    )
  // /me can work while the rest is blocked, so also try what the app uses: search and lea's music.
  const probe = async (path: string) => {
    const r = await fetch(`https://api.spotify.com/v1${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    return r.ok
      ? { ok: true }
      : {
          ok: false,
          status: r.status,
          retryAfterSeconds: r.headers.get('retry-after'),
          body: (await r.text()).slice(0, 200),
        }
  }
  const checks = {
    search: await probe('/search?q=love&type=track&limit=1'),
    recentlyPlayed: await probe('/me/player/recently-played?limit=1'),
    topTracks: await probe('/me/top/tracks?limit=1'),
  }
  report.checks = checks
  const failed = Object.values(checks).filter((c) => !c.ok) as {
    status: number
    retryAfterSeconds: string | null
  }[]
  if (failed.some((c) => c.status === 429)) {
    const wait = Math.max(
      ...failed.map((c) => Number(c.retryAfterSeconds) || 0),
    )
    return send(
      `spotify is rate limiting this app (too many calls)${wait ? `: it says to wait ${Math.ceil(wait / 60)} min` : ''}. stimbox shows demo music until it lifts`,
    )
  }
  if (failed.length)
    return send(
      'the account works but some spotify calls fail: see checks below',
    )
  return send('connected: spotify works on this deployment')
}
