import { useEffect, useRef, useSyncExternalStore } from 'react'
import { spotifyEmbed } from '../lib/spotifyEmbed.ts'

// Where Spotify's player lives. Invisible but on screen, so the browser loads it and lets it play.
// If the browser blocks playback anyway, it pops up above the dock for one tap on its play button.
export function SpotifyEmbedHost() {
  const ref = useRef<HTMLDivElement>(null)
  const stalled = useSyncExternalStore(
    spotifyEmbed.subscribeStalled,
    spotifyEmbed.isStalled,
  )
  useEffect(() => {
    if (ref.current) spotifyEmbed.setHost(ref.current)
  }, [])
  return (
    <div
      aria-hidden={!stalled}
      role={stalled ? 'dialog' : undefined}
      aria-label={stalled ? 'start spotify' : undefined}
      className={
        stalled
          ? 'fixed bottom-24 left-1/2 z-[2000] w-[340px] -translate-x-1/2 rounded-window border border-hairline bg-window p-2.5 shadow-window'
          : 'pointer-events-none fixed bottom-0 left-0 z-0 w-[300px] opacity-0'
      }
    >
      {stalled && (
        <p className="mb-2 text-[11px] text-body">
          your browser wants one tap: press play on spotify’s player ↓
        </p>
      )}
      <div ref={ref} className="h-20 w-full overflow-hidden rounded-art" />
    </div>
  )
}
