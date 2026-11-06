import { useEffect, useState } from 'react'
import { load, save } from './storage.ts'

// lea's own browser can change her Spotify (add songs, delete playlists). She opens
// stimbox once with #owner=<STIMBOX_OWNER_KEY>; the key is kept in this browser and the hash removed.
function readKey() {
  const m = /[#&]owner=([^&]+)/.exec(window.location.hash)
  if (m) {
    save('ownerKey', decodeURIComponent(m[1]))
    history.replaceState(
      null,
      '',
      window.location.pathname + window.location.search,
    )
  }
  return load<string>('ownerKey', '')
}
const key = typeof window === 'undefined' ? '' : readKey()

export function ownerFetch(path: string, init: RequestInit = {}) {
  return fetch(path, {
    ...init,
    headers: { ...init.headers, 'x-stimbox-owner': key },
  })
}

let checked: Promise<boolean> | null = null
// Asks the server once whether the saved key is right.
export function useIsOwner() {
  const [owner, setOwner] = useState(false)
  useEffect(() => {
    if (!key) return
    checked ??= ownerFetch('/api/spotify/playlist')
      .then((r) => (r.ok ? (r.json() as Promise<{ owner: boolean }>) : null))
      .then((d) => !!d?.owner)
      .catch(() => false)
    let live = true
    void checked.then((v) => live && setOwner(v))
    return () => {
      live = false
    }
  }, [])
  return owner
}
