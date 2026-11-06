import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Art } from '../data/fake.ts'
import { load, save } from '../lib/storage.ts'

// Playlists the listener makes. Stored in this browser until Spotify is connected
// (then POST /me/playlists and the playlist items endpoints).

export type Privacy = 'public' | 'unlisted' | 'private'

export type Playlist = {
  id: string
  title: string
  description: string
  privacy: Privacy
  collaborate: boolean
  art: Art
  trackIds: string[]
}

export type LibraryTab = 'loved' | 'liked' | 'disliked' | 'playlists'

type PlaylistsApi = {
  playlists: Playlist[]
  create: (p: Omit<Playlist, 'id' | 'art' | 'trackIds'>) => void
  remove: (id: string) => () => void
  addTrack: (playlistId: string, trackId: string) => void
  removeTrack: (playlistId: string, trackId: string) => () => void
  // a song waiting to go into the playlist being created ("+ new playlist…" on a song)
  pendingTrack: string | null
  setPendingTrack: (id: string | null) => void
  libraryTab: LibraryTab
  setLibraryTab: (t: LibraryTab) => void
}

const PlaylistsContext = createContext<PlaylistsApi | null>(null)

const ARTS: Art[] = ['art-1', 'art-4', 'art-3', 'art-6', 'art-7', 'art-9']

export function PlaylistsProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>(() =>
    load('playlists', []),
  )
  const [pendingTrack, setPendingTrack] = useState<string | null>(null)
  const [libraryTab, setLibraryTab] = useState<LibraryTab>('loved')

  const update = useCallback((fn: (prev: Playlist[]) => Playlist[]) => {
    setPlaylists((prev) => {
      const next = fn(prev)
      save('playlists', next)
      return next
    })
  }, [])

  const create = useCallback<PlaylistsApi['create']>(
    (p) => {
      const first = pendingTrack
      update((prev) => [
        {
          ...p,
          id: `pl-${Date.now().toString(36)}`,
          art: ARTS[prev.length % ARTS.length],
          trackIds: first ? [first] : [],
        },
        ...prev,
      ])
      setPendingTrack(null)
    },
    [pendingTrack, update],
  )

  const remove = useCallback(
    (id: string) => {
      let removed: { pl: Playlist; at: number } | null = null
      update((prev) => {
        const at = prev.findIndex((p) => p.id === id)
        if (at < 0) return prev
        removed = { pl: prev[at], at }
        return prev.filter((p) => p.id !== id)
      })
      return () =>
        update((prev) => {
          if (!removed || prev.some((p) => p.id === id)) return prev
          const next = [...prev]
          next.splice(removed.at, 0, removed.pl)
          return next
        })
    },
    [update],
  )

  const addTrack = useCallback(
    (playlistId: string, trackId: string) =>
      update((prev) =>
        prev.map((p) =>
          p.id === playlistId && !p.trackIds.includes(trackId)
            ? { ...p, trackIds: [...p.trackIds, trackId] }
            : p,
        ),
      ),
    [update],
  )

  const removeTrack = useCallback(
    (playlistId: string, trackId: string) => {
      let at = -1
      update((prev) =>
        prev.map((p) => {
          if (p.id !== playlistId) return p
          at = p.trackIds.indexOf(trackId)
          return { ...p, trackIds: p.trackIds.filter((t) => t !== trackId) }
        }),
      )
      return () =>
        update((prev) =>
          prev.map((p) => {
            if (p.id !== playlistId || p.trackIds.includes(trackId)) return p
            const ids = [...p.trackIds]
            ids.splice(Math.max(0, at), 0, trackId)
            return { ...p, trackIds: ids }
          }),
        )
    },
    [update],
  )

  const api = useMemo<PlaylistsApi>(
    () => ({
      playlists,
      create,
      remove,
      addTrack,
      removeTrack,
      pendingTrack,
      setPendingTrack,
      libraryTab,
      setLibraryTab,
    }),
    [
      playlists,
      create,
      remove,
      addTrack,
      removeTrack,
      pendingTrack,
      libraryTab,
    ],
  )
  return <PlaylistsContext value={api}>{children}</PlaylistsContext>
}

export function usePlaylists() {
  const ctx = use(PlaylistsContext)
  if (!ctx) throw new Error('usePlaylists needs PlaylistsProvider')
  return ctx
}
