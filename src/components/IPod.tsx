import { useMemo } from 'react'
import { currentLine, fmt, lyricsFor } from '../data/fake.ts'
import { useDrag } from '../lib/useDrag.ts'
import { useCompact } from '../lib/useMedia.ts'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { Art } from './Art.tsx'
import { Reactions } from './Reactions.tsx'

// The player. Drag it by its body; the screen opens now playing; the wheel controls playback.
export function IPod() {
  const p = usePlayer()
  const { pos, show, open, zOf } = useDesktop()
  const drag = useDrag('ipod')
  const compact = useCompact()
  const lines = useMemo(() => lyricsFor(p.track), [p.track])
  const cur = currentLine(lines, p.position)
  const showingLyrics = open.has('nowplaying')
  const pct = (p.position / p.track.duration) * 100

  return (
    <aside
      aria-label="ipod player"
      {...(compact ? {} : drag)}
      className={`ipod-body flex w-60 touch-none flex-col items-center rounded-[26px] border border-hairline p-4 select-none ${
        compact
          ? 'relative mx-auto'
          : 'absolute cursor-grab active:cursor-grabbing'
      }`}
      style={
        compact
          ? undefined
          : { left: pos.ipod.x, top: pos.ipod.y, zIndex: zOf('ipod') }
      }
    >
      <button
        type="button"
        onClick={() => show('nowplaying')}
        aria-label="open now playing"
        className="flex h-[156px] w-[206px] flex-col overflow-hidden rounded-md border-2 border-lcd-ink/80 bg-lcd text-left text-lcd-ink"
      >
        <span className="lcd-bar flex h-4 items-center justify-between border-b border-lcd-ink/60 px-1.5 text-[10px]">
          <span aria-hidden>{p.playing ? '▶' : '❚❚'}</span>
          <span>{showingLyrics ? 'lyrics' : 'now playing'}</span>
          <span aria-hidden>▮▮▮</span>
        </span>
        {showingLyrics ? (
          <span className="flex flex-1 flex-col justify-center px-2 text-[12px] leading-snug">
            <span className="truncate opacity-50">
              {lines[cur - 1]?.text ?? ' '}
            </span>
            <span className="truncate bg-lcd-ink px-1 text-lcd">
              {lines[cur]?.text ?? '♪ ♪ ♪'}
            </span>
            <span className="truncate opacity-50">
              {lines[cur + 1]?.text ?? ' '}
            </span>
          </span>
        ) : (
          <span className="flex gap-2 px-2 pt-2 pb-1">
            <Art art={p.track.art} size={62} />
            <span className="min-w-0 text-[11px] leading-snug">
              <b className="block truncate text-[13px]">{p.track.title}</b>
              <span className="line-clamp-2">{p.track.artist}</span>
              <span className="block truncate opacity-70">{p.track.album}</span>
            </span>
          </span>
        )}
        <span className="mx-2 block h-[7px] border border-lcd-ink bg-window">
          <span
            className="block h-full bg-lcd-ink"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="flex justify-between px-2 text-[10px] tabular-nums">
          <span>{fmt(p.position)}</span>
          <span>-{fmt(p.track.duration - p.position)}</span>
        </span>
      </button>
      <div className="mt-1 w-[206px]">
        <Reactions variant="lcd" />
      </div>

      <div className="ipod-wheel relative mt-3 size-44 rounded-full border border-hairline/70 text-[11px] font-bold text-mute">
        <button
          type="button"
          onClick={() => show('nowplaying')}
          className="absolute top-2 left-1/2 -translate-x-1/2 px-2"
        >
          menu
        </button>
        <button
          type="button"
          onClick={p.prev}
          aria-label="previous"
          className="absolute top-1/2 left-2 -translate-y-1/2 px-1"
        >
          ◀◀
        </button>
        <button
          type="button"
          onClick={p.next}
          aria-label="next"
          className="absolute top-1/2 right-2 -translate-y-1/2 px-1"
        >
          ▶▶
        </button>
        <button
          type="button"
          onClick={p.toggle}
          aria-label={p.playing ? 'pause' : 'play'}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2"
        >
          ▶ ❚❚
        </button>
        <button
          type="button"
          onClick={p.toggle}
          aria-label={p.playing ? 'pause' : 'play'}
          className="absolute inset-[58px] rounded-full border border-hairline/70 bg-gradient-to-b from-chrome-hi to-ipod-lo active:brightness-95"
        />
      </div>
    </aside>
  )
}
