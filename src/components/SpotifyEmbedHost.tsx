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
        <div className="mb-2 flex items-start gap-2">
          <p className="flex-1 text-[11px] text-body">
            your browser blocked spotify from starting on its own. press play to
            start the song.
          </p>
          <button
            type="button"
            onClick={spotifyEmbed.dismiss}
            aria-label="close"
            className="text-[13px] text-mute hover:text-ink"
          >
            ×
          </button>
        </div>
      )}
      {stalled && (
        <div className="mb-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => void spotifyEmbed.retry()}
            className="aqua-gel rounded-pill border px-4 py-0.5 text-[12px]"
          >
            ▶ play
          </button>
          <a
            href={`https://open.spotify.com/track/${spotifyEmbed.currentUri().split(':').pop()}`}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-aqua-deep underline"
          >
            open in spotify ↗
          </a>
        </div>
      )}
      <div ref={ref} className="h-20 w-full overflow-hidden rounded-art" />
    </div>
  )
}
