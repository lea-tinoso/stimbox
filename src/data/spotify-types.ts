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
  albumId?: string
}
export type OutCollection = {
  id: string
  title: string
  kind: 'playlist' | 'album'
  subtitle: string
  image: string
  trackIds: string[]
  // lea's own playlist, so she can add songs to it
  owned?: boolean
}
// A playlist, album or artist in search results. Its songs load when it's opened.
export type OutResult = {
  id: string
  kind: 'playlist' | 'album' | 'artist'
  title: string
  subtitle: string
  image: string
}
export type SearchData = {
  tracks: OutTrack[]
  playlists: OutResult[]
  albums: OutResult[]
  artists: OutResult[]
}
// An artist's page: Spotify for the music, Last.fm for listeners, bio and similar artists.
export type ArtistData = {
  id: string
  name: string
  image: string
  url: string
  songs: OutTrack[]
  albums: OutResult[]
  listeners: number | null
  bio: string
  similar: string[]
  following: boolean | null
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
