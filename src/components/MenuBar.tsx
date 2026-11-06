import { useEffect, useState } from 'react'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 15_000)
    return () => window.clearInterval(id)
  }, [])
  const day = now.toLocaleDateString('en', { weekday: 'short' }).toLowerCase()
  const time = now
    .toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })
    .toLowerCase()
  return `${day} ${time}`
}

export function MenuBar({
  query,
  onQuery,
}: {
  query: string
  onQuery: (q: string) => void
}) {
  const { show, reset } = useDesktop()
  const { track, playing, toggle } = usePlayer()
  const clock = useClock()

  return (
    <nav
      aria-label="menu bar"
      className="fixed inset-x-0 top-0 z-[1000] flex h-6 items-center gap-4 border-b border-hairline bg-gradient-to-b from-window to-chrome-hi px-3 text-[13px] text-ink shadow-[0_1px_3px_rgb(0_0_0/0.2)]"
    >
      <span className="font-bold">♪ stimbox</span>
      <button
        type="button"
        className="hidden sm:block"
        onClick={() => show('library')}
      >
        library
      </button>
      <button type="button" className="hidden sm:block" onClick={toggle}>
        {playing ? 'pause' : 'play'}
      </button>
      <button
        type="button"
        className="hidden sm:block"
        onClick={() => show('stats')}
      >
        your algorithm
      </button>
      <button type="button" className="hidden md:block" onClick={reset}>
        tidy desktop
      </button>
      <div className="ml-auto flex items-center gap-3">
        <label className="hidden md:block">
          <span className="sr-only">search songs, artists, albums</span>
          <input
            type="search"
            name="q"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(e) => {
              onQuery(e.target.value)
              show('search')
            }}
            onFocus={() => show('search')}
            placeholder="⌕ search songs, artists, albums…"
            className="h-[18px] w-56 rounded-pill border border-hairline bg-window px-2 text-[11px] shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] placeholder:text-mute"
          />
        </label>
        <button
          type="button"
          onClick={() => show('nowplaying')}
          className="aqua-pill flex max-w-56 items-center gap-1 truncate rounded-pill border border-hairline px-2 text-[12px]"
        >
          <span aria-hidden>{playing ? '▶' : '❚❚'}</span>
          <span className="truncate">
            {track.title} · {track.artist}
          </span>
        </button>
        <span className="hidden tabular-nums sm:block">{clock}</span>
      </div>
    </nav>
  )
}
