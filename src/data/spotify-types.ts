// The shape /api/spotify/home returns. Shared by the Vercel function and the app.

export type OutTrack = {
  id: string
  uri: string
  title: string
  artist: string
  album: string
  year: number
  image: string
  duration: number
}
export type OutCollection = {
  id: string
  title: string
  kind: 'playlist' | 'album'
  subtitle: string
  image: string
  trackIds: string[]
}
export type HomeData = {
  tracks: OutTrack[]
  recent: { trackId: string; playedAt: string }[]
  playlists: OutCollection[]
  recentAlbums: OutCollection[]
  liked: string[]
  top: Record<
    '4w' | '6m' | '1y',
    {
      artists: { name: string; image: string; genres: string[] }[]
      trackIds: string[]
    }
  >
}
