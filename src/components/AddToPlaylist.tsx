import { useEffect, useRef, useState } from 'react'
import { getTrack } from '../data/fake.ts'
import { useDesktop } from '../state/desktop.tsx'
import { usePlaylists } from '../state/playlists.tsx'

// "+" on a song row: a small Aqua menu of your playlists, plus "new playlist…".
// The menu is fixed to the viewport so window bodies that scroll don't clip it.
export function AddToPlaylist({ id }: { id: string }) {
  const { playlists, addTrack, setPendingTrack } = usePlaylists()
  const { show } = useDesktop()
  const [at, setAt] = useState<{ x: number; y: number } | null>(null)
  const button = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const title = getTrack(id).title

  useEffect(() => {
    if (!at) return
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'pointerdown') {
        const t = e.target as Node
        if (menu.current?.contains(t) || button.current?.contains(t)) return
      }
      setAt(null)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [at])

  const open = () => {
    const r = button.current!.getBoundingClientRect()
    const x = Math.min(r.right - 200, window.innerWidth - 210)
    const below = r.bottom + 4
    const y = below + 200 > window.innerHeight ? r.top - 4 - 200 : below
    setAt(at ? null : { x: Math.max(8, x), y: Math.max(28, y) })
  }

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={open}
        aria-label={`add ${title} to a playlist`}
        aria-haspopup="menu"
        aria-expanded={!!at}
        className="grid size-6 place-items-center rounded-full text-[15px] text-mute hover:text-aqua-deep"
      >
        +
      </button>
      {at && (
        <div
          ref={menu}
          role="menu"
          aria-label={`add ${title} to`}
          className="fixed z-[950] w-[200px] rounded-[5px] border border-hairline bg-window/95 py-1 text-[12px] shadow-window"
          style={{ left: at.x, top: at.y }}
        >
          <p className="truncate px-3 py-0.5 text-[11px] text-mute">
            add “{title}” to
          </p>
          {playlists.map((p) => {
            const has = p.trackIds.includes(id)
            return (
              <button
                key={p.id}
                type="button"
                role="menuitem"
                disabled={has}
                onClick={() => {
                  addTrack(p.id, id)
                  setAt(null)
                }}
                className="flex w-full items-center gap-2 px-3 py-1 text-left text-ink hover:bg-selection hover:text-window disabled:text-mute disabled:hover:bg-transparent"
              >
                <span className="min-w-0 flex-1 truncate">{p.title}</span>
                {has && <span aria-label="already added">✓</span>}
              </button>
            )
          })}
          {playlists.length > 0 && <hr className="my-1 border-chrome-hi" />}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setPendingTrack(id)
              show('newplaylist')
              setAt(null)
            }}
            className="w-full px-3 py-1 text-left text-ink hover:bg-selection hover:text-window"
          >
            + new playlist…
          </button>
        </div>
      )}
    </>
  )
}
