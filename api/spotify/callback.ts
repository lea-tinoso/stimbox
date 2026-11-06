import { tokenRequest } from '../_spotify.js'

// Step 2 of the one-time setup. Spotify sends lea back to /callback (rewritten here in vercel.json).
// The page shows her refresh token once so she can save it as SPOTIFY_REFRESH_TOKEN on Vercel.
// Nothing is stored: anyone else who logs in only sees their own token.
const page = (title: string, body: string) =>
  new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>body{font:14px/1.5 'Lucida Grande',Verdana,sans-serif;background:#f4f4f4;color:#111;max-width:560px;margin:48px auto;padding:0 16px}
textarea{width:100%;height:96px;font:12px Monaco,Menlo,monospace}code{background:#fff;padding:1px 4px;border:1px solid #c9c9c9}</style>
<h1 style="font-weight:normal">${title}</h1>${body}`,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'Set-Cookie': 'stimbox_state=; Path=/; Max-Age=0',
      },
    },
  )

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`)

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  const cookie = request.headers.get('cookie') ?? ''
  if (url.searchParams.get('error'))
    return page(
      'spotify said no',
      `<p>${escape(url.searchParams.get('error')!)}</p>`,
    )
  if (!code || !state || !cookie.includes(`stimbox_state=${state}`))
    return page(
      'that link expired',
      '<p>start again at <a href="/api/spotify/login">/api/spotify/login</a>.</p>',
    )
  try {
    const t = await tokenRequest({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${url.origin}/callback`,
    })
    return page(
      'stimbox is connected ♪',
      `<p>copy this refresh token into Vercel → stimbox → Settings → Environment Variables as <code>SPOTIFY_REFRESH_TOKEN</code>, then redeploy.</p>
<textarea readonly onclick="this.select()">${escape(t.refresh_token ?? '')}</textarea>
<p>treat it like a password: don't paste it anywhere else.</p>`,
    )
  } catch (e) {
    return page('could not connect', `<p>${escape(String(e))}</p>`)
  }
}
