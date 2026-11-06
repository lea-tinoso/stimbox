import { useEffect, useState } from 'react'
import { ownerFetch } from './owner.ts'

// GET a JSON endpoint and keep the answer for this page visit. null url = don't fetch.
const cache = new Map<string, unknown>()

// prepare runs once when the answer arrives (e.g. to register its songs).
export function useJson<T>(
  url: string | null,
  owner = false,
  prepare?: (data: T) => void,
) {
  const [got, setGot] = useState<{ url: string; data: T | null }>({
    url: '',
    data: null,
  })
  useEffect(() => {
    if (!url || cache.has(url)) return
    const ctl = new AbortController()
    ;(owner ? ownerFetch : fetch)(url, { signal: ctl.signal })
      .then((r) => (r.ok ? (r.json() as Promise<T>) : null))
      .then((data) => {
        if (data) {
          prepare?.(data)
          cache.set(url, data)
        }
        setGot({ url, data })
      })
      .catch(() => {})
    return () => ctl.abort()
    // prepare is a module-level function at every call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, owner])
  if (!url) return { data: null, loading: false }
  if (cache.has(url)) return { data: cache.get(url) as T, loading: false }
  return got.url === url
    ? { data: got.data, loading: false }
    : { data: null, loading: true }
}
