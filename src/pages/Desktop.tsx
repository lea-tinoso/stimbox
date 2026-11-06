import { useEffect, useState } from 'react'
import { DesktopClutter } from '../components/DesktopClutter.tsx'
import { Dock } from '../components/Dock.tsx'
import {
  ForYouWindow,
  ListenAgainWindow,
  StatsWindow,
  TrendingWindow,
} from '../components/HomeWindows.tsx'
import { IPod } from '../components/IPod.tsx'
import { LibraryWindow, SearchWindow } from '../components/LibraryWindows.tsx'
import { MenuBar } from '../components/MenuBar.tsx'
import { NowPlayingWindow } from '../components/NowPlayingWindow.tsx'
import { Wallpaper } from '../components/Wallpaper.tsx'
import { useCompact } from '../lib/useMedia.ts'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'

function useShortcuts() {
  const { show } = useDesktop()
  const { toggle, next, prev } = usePlayer()
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement).closest('input, textarea')
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'l') {
        e.preventDefault()
        show('nowplaying')
      } else if (!typing && e.key === ' ') {
        e.preventDefault()
        toggle()
      } else if (!typing && e.key === 'ArrowRight' && e.altKey) next()
      else if (!typing && e.key === 'ArrowLeft' && e.altKey) prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [show, toggle, next, prev])
}

export default function Desktop() {
  const [query, setQuery] = useState('')
  const compact = useCompact()
  useShortcuts()

  return (
    <div className="relative h-full overflow-hidden bg-desk">
      <Wallpaper />
      <MenuBar query={query} onQuery={setQuery} />
      {!compact && <DesktopClutter />}
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
        <NowPlayingWindow />
        {!compact && <IPod />}
      </main>
      <Dock />
    </div>
  )
}
