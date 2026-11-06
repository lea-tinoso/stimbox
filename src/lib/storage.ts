// localStorage that never throws (private mode, blocked storage, SSR).
export function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`stimbox:${key}`)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(`stimbox:${key}`, JSON.stringify(value))
  } catch {
    // ignore
  }
}
