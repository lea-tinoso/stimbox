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
].join(' ')

export function env(name: string) {
  return process.env[name] ?? ''
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

// GET a Web API path. Returns null on any error so one failing section doesn't break the page.
export async function spotify<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API}${path}`, {
      headers: { Authorization: `Bearer ${await accessToken()}` },
    })
    if (!res.ok) {
      console.warn(`spotify ${path} → ${res.status}`)
      return null
    }
    return (await res.json()) as T
  } catch (e) {
    console.warn(`spotify ${path} failed`, e)
    return null
  }
}

export function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  })
}

// Shared CDN cache: Spotify is asked at most every few minutes, however many people visit.
export const CACHE = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}
