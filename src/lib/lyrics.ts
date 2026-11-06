import { useEffect, useState } from 'react'
import { lyricsFor, type LyricLine, type Track } from '../data/fake.ts'

// Real songs get synced lyrics from LRCLIB (free, no key). Demo songs keep their placeholder lyrics.
// https://lrclib.net/docs

export type Lyrics = {
  lines: LyricLine[]
  // 'synced' follows the song; 'plain' is spread evenly; 'placeholder' is demo text.
  kind: 'synced' | 'plain' | 'placeholder' | 'none' | 'loading'
}

const cache = new Map<string, Lyrics>()

function parseSynced(lrc: string): LyricLine[] {
  return lrc.split('\n').flatMap((row) => {
    const m = row.match(/^\[(\d+):(\d+(?:\.\d+)?)\]\s*(.*)$/)
    if (!m || !m[3].trim()) return []
    return [{ at: Number(m[1]) * 60 + Number(m[2]), text: m[3].toLowerCase() }]
  })
}

function spread(text: string, duration: number): LyricLine[] {
  const rows = text
    .split('\n')
    .map((r) => r.trim())
    .filter(Boolean)
  const step = Math.max(3, (duration - 12) / Math.max(1, rows.length))
  return rows.map((r, i) => ({ at: 8 + i * step, text: r.toLowerCase() }))
}

async function fetchLyrics(t: Track): Promise<Lyrics> {
  const q = new URLSearchParams({
    track_name: t.title,
    artist_name: t.artist.split(', ')[0],
    album_name: t.album,
    duration: String(t.duration),
  })
  const res = await fetch(`https://lrclib.net/api/get?${q}`)
  if (!res.ok) return { lines: [], kind: 'none' }
  const d = (await res.json()) as {
    syncedLyrics?: string | null
    plainLyrics?: string | null
  }
  if (d.syncedLyrics)
    return { lines: parseSynced(d.syncedLyrics), kind: 'synced' }
  if (d.plainLyrics)
    return { lines: spread(d.plainLyrics, t.duration), kind: 'plain' }
  return { lines: [], kind: 'none' }
}

export function useLyrics(track: Track): Lyrics {
  const [got, setGot] = useState<{ id: string; lyrics: Lyrics } | null>(null)
  const real = Boolean(track.uri)
  useEffect(() => {
    if (!real || cache.has(track.id)) return
    let live = true
    fetchLyrics(track)
      .catch((): Lyrics => ({ lines: [], kind: 'none' }))
      .then((lyrics) => {
        cache.set(track.id, lyrics)
        if (live) setGot({ id: track.id, lyrics })
      })
    return () => {
      live = false
    }
  }, [real, track])
  if (!real) return { lines: lyricsFor(track), kind: 'placeholder' }
  const hit = cache.get(track.id)
  if (hit) return hit
  if (got?.id === track.id) return got.lyrics
  return { lines: [], kind: 'loading' }
}
