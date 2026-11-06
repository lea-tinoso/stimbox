import { useDesktop, type WinId } from '../state/desktop.tsx'

// Icons are the Mac OS X set from ryOS (github.com/ryokun6/ryos, public/icons/macosx).
const items: { icon: string; label: string; opens: WinId[] }[] = [
  {
    icon: 'mac',
    label: 'home',
    opens: ['listen', 'foryou', 'trending', 'stats'],
  },
  { icon: 'ipod', label: 'now playing', opens: ['nowplaying'] },
  { icon: 'minesweeper', label: 'search', opens: ['search'] },
  { icon: 'karaoke', label: 'lyrics', opens: ['nowplaying'] },
  { icon: 'dashboard', label: 'your algorithm', opens: ['stats'] },
  { icon: 'sounds', label: 'library', opens: ['library'] },
]

export function Dock() {
  const { open, show, toBigPlayer } = useDesktop()
  const running = (ids: WinId[]) => ids.some((id) => open.has(id))

  return (
    <nav
      aria-label="dock"
      className="dock-glass fixed bottom-0 left-1/2 z-[900] flex h-16 origin-bottom -translate-x-1/2 max-[900px]:scale-[0.6] items-end gap-1.5 rounded-t-md border border-window/90 px-4 pb-1"
    >
      {items.map((it) => (
        <button
          key={it.label}
          type="button"
          onClick={() =>
            it.opens[0] === 'nowplaying'
              ? toBigPlayer()
              : it.opens.forEach(show)
          }
          className="group relative -mt-4 size-16 origin-bottom transition-transform duration-150 hover:-translate-y-1.5 hover:scale-110"
          aria-label={it.label}
        >
          <img
            src={`/icons/${it.icon}.png`}
            alt=""
            width={64}
            height={64}
            className="drop-shadow-[0_3px_3px_rgb(0_0_0/0.3)]"
          />
          <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-pill bg-ink/75 px-2 py-0.5 text-[11px] whitespace-nowrap text-window group-hover:block group-focus-visible:block">
            {it.label}
          </span>
          {running(it.opens) && (
            <span
              aria-hidden
              className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 border-x-4 border-b-[5px] border-x-transparent border-b-ink"
            />
          )}
        </button>
      ))}
      <span
        aria-hidden
        className="mx-1.5 mb-2 h-11 w-px bg-ink/20 shadow-[1px_0_0_white]"
      />
      <button
        type="button"
        onClick={() => show('library')}
        className="group relative -mt-4 size-16 origin-bottom transition-transform duration-150 hover:-translate-y-1.5 hover:scale-110"
        aria-label="disliked songs"
      >
        <img
          src="/icons/trash-empty.png"
          alt=""
          width={64}
          height={64}
          className="drop-shadow-[0_3px_3px_rgb(0_0_0/0.3)]"
        />
        <span className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 rounded-pill bg-ink/75 px-2 py-0.5 text-[11px] whitespace-nowrap text-window group-hover:block">
          disliked
        </span>
      </button>
    </nav>
  )
}
