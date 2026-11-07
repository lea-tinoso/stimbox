// Server-side Spotify access for stimbox. Visitors never log in: the app shows lea's own music,
// using a refresh token she created once at /api/spotify/login and saved as a Vercel env var.
// Files starting with _ are not routes on Vercel.

const ACCOUNTS = 'https://accounts.spotify.com'
const API = 'https://api.spotify.com/v1'

export const SCOPES = [
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'playlist-read-private',
  'playlist-read-collaborative',
  // For lea only (owner key): add songs to her playlists and delete them.
  'playlist-modify-public',
  'playlist-modify-private',
  'user-follow-read',
  'user-follow-modify',
].join(' ')

export function env(name: string) {
  return process.env[name] ?? ''
}

// The address Spotify sends lea back to. It must match the dashboard exactly, so it comes from the
// public host the browser used (Vercel's forwarded headers), not the function's internal URL.
export function redirectUri(request: Request) {
  if (env('SPOTIFY_REDIRECT_URI')) return env('SPOTIFY_REDIRECT_URI')
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host
  const proto =
    host.startsWith('127.0.0.1') || host.startsWith('localhost')
      ? 'http'
      : 'https'
  return `${proto}://${host}/api/spotify/callback`
}

export function basicAuth() {
  return `Basic ${Buffer.from(`${env('SPOTIFY_CLIENT_ID')}:${env('SPOTIFY_CLIENT_SECRET')}`).toString('base64')}`
}

export async function tokenRequest(body: Record<string, string>) {
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: {
      Authorization: basicAuth(),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams(body),
  })
  if (!res.ok)
    throw new Error(`spotify token ${res.status}: ${await res.text()}`)
  return (await res.json()) as {
    access_token: string
    expires_in: number
    refresh_token?: string
  }
}

// One access token per warm function instance, refreshed a minute before it expires.
let cached: { token: string; until: number } | null = null

async function accessToken() {
  if (cached && Date.now() < cached.until) return cached.token
  const t = await tokenRequest({
    grant_type: 'refresh_token',
    refresh_token: env('SPOTIFY_REFRESH_TOKEN'),
  })
  cached = {
    token: t.access_token,
    until: Date.now() + (t.expires_in - 60) * 1000,
  }
  return t.access_token
}

export function configured() {
  return Boolean(
    env('SPOTIFY_CLIENT_ID') &&
    env('SPOTIFY_CLIENT_SECRET') &&
    env('SPOTIFY_REFRESH_TOKEN'),
  )
}

// Spotify gives new apps a small daily search quota (a 429 QUOTA_EXCEEDED that lasts hours), and
// radio, trending and artist pages all search. So each warm instance remembers search answers, and
// stops searching while Spotify says to wait instead of piling on more calls.
const searches = new Map<string, unknown>()
let searchBlockedUntil = 0

// GET a Web API path. Returns null on any error so one failing section doesn't break the page.
export async function spotify<T>(path: string): Promise<T | null> {
  const isSearch = path.startsWith('/search')
  if (isSearch) {
    if (searches.has(path)) return searches.get(path) as T
    if (Date.now() < searchBlockedUntil) return null
  }
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${await accessToken()}` },
    })
    if (!res.ok) {
      const wait = Number(res.headers.get('retry-after')) || 60
      console.warn(`spotify ${path} → ${res.status}, retry after ${wait}s`)
      if (res.status === 429 && isSearch)
        searchBlockedUntil = Date.now() + wait * 1000
      return null
    }
    const data = (await res.json()) as T
    if (isSearch) {
      if (searches.size > 2000) searches.clear()
      searches.set(path, data)
    }
    return data
  } catch (e) {
    console.warn(`spotify ${path} failed`, e)
    return null
  }
}

// A change to lea's Spotify (add a song, delete a playlist). Returns whether Spotify said ok.
export async function spotifyWrite(
  method: 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
) {
  try {
    const res = await fetch(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${await accessToken()}`,
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    if (!res.ok) console.warn(`spotify ${method} ${path} → ${res.status}`)
    return res.ok
  } catch (e) {
    console.warn(`spotify ${method} ${path} failed`, e)
    return false
  }
}

// Only lea may change her Spotify. Her browser sends the STIMBOX_OWNER_KEY env var's value.
export function isOwner(request: Request) {
  const key = env('STIMBOX_OWNER_KEY')
  const sent = request.headers.get('x-stimbox-owner') ?? ''
  if (key.length < 12 || sent.length !== key.length) return false
  let diff = 0
  for (let i = 0; i < key.length; i++)
    diff |= key.charCodeAt(i) ^ sent.charCodeAt(i)
  return diff === 0
}

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

// Shared CDN cache: Spotify is asked at most every few minutes, however many people visit.
// For answers built from searches (search box, radio, artist pages): they barely change, and every
// cache miss spends search quota.
export const LONG_CACHE = {
  'Cache-Control': 'public, s-maxage=86400, stale-while-revalidate=604800',
}
export const NO_STORE = { 'Cache-Control': 'no-store' }

export const CACHE = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}
