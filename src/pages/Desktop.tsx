import { useEffect, useState } from 'react'
import { AboutWindow, TerminalWindow } from '../components/AboutWindows.tsx'
import { CollectionWindow } from '../components/CollectionWindow.tsx'
import { ArtistWindow, SongWindow } from '../components/DetailWindows.tsx'
import { DesktopClutter } from '../components/DesktopClutter.tsx'
import { Dock } from '../components/Dock.tsx'
import {
  ForYouWindow,
  ListenAgainWindow,
  StatsWindow,
  TrendingWindow,
} from '../components/HomeWindows.tsx'
import { IPod } from '../components/IPod.tsx'
import {
  LibraryWindow,
  NewPlaylistWindow,
  RecentWindow,
  SearchWindow,
} from '../components/LibraryWindows.tsx'
import { MenuBar } from '../components/MenuBar.tsx'
import { NowPlayingWindow } from '../components/NowPlayingWindow.tsx'
import { SpotifyEmbedHost } from '../components/SpotifyEmbedHost.tsx'
import { Signature } from '../components/Signature.tsx'
import { Wallpaper } from '../components/Wallpaper.tsx'
import { useCompact, usePhone } from '../lib/useMedia.ts'
import { PhoneIPod } from '../components/PhoneIPod.tsx'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'

function useShortcuts() {
  const { toBigPlayer, open, show, hide } = useDesktop()
  const { toggle, next, prev } = usePlayer()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        toBigPlayer()
      } else if (!typing && e.key === '`') {
        // A hidden console key, like in PC games: toggles the stats-for-nerds terminal.
        e.preventDefault()
        if (open.has('terminal')) hide('terminal')
        else show('terminal')
      } else if (!typing && e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (!typing && e.key === 'ArrowRight' && e.altKey) next()
      else if (!typing && e.key === 'ArrowLeft' && e.altKey) prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toBigPlayer, toggle, next, prev, open, show, hide])
}

export default function Desktop() {
  const [query, setQuery] = useState('')
  const compact = useCompact()
  const phone = usePhone()
  useShortcuts()

  // Spotify's player stays in the same place in both layouts: if it were rebuilt when the
  // window crosses the phone width, the song would stop.
  return (
    <>
      {phone ? (
        <PhoneIPod />
      ) : (
        <DesktopLayout query={query} onQuery={setQuery} compact={compact} />
      )}
      <SpotifyEmbedHost />
    </>
  )
}

function DesktopLayout({
  query,
  onQuery: setQuery,
  compact,
}: {
  query: string
  onQuery: (q: string) => void
  compact: boolean
}) {
  return (
    <div className="relative h-full overflow-hidden bg-desk">
      <Wallpaper />
      <MenuBar query={query} onQuery={setQuery} />
      {!compact && <DesktopClutter />}
      {!compact && <Signature />}
      <main
        className={
          compact
            ? 'relative z-10 flex h-full flex-col gap-4 overflow-y-auto px-3 pt-9 pb-24'
            : ''
        }
      >
        <h1 className="sr-only">stimbox</h1>
        {compact && <IPod />}
        <ListenAgainWindow />
        <ForYouWindow />
        <TrendingWindow />
        <StatsWindow />
        <SearchWindow query={query} />
        <LibraryWindow />
        <RecentWindow />
        <NewPlaylistWindow />
        <CollectionWindow />
        <SongWindow />
        <ArtistWindow />
        <AboutWindow />
        <TerminalWindow />
        <NowPlayingWindow />
        {!compact && <IPod />}
      </main>
      <Dock />
    </div>
  )
}
