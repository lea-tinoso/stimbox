import {
  createContext,
  use,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { load, save } from '../lib/storage.ts'

// Which windows are open, where they sit, and which is in front. Positions persist per browser.

export type WinId =
  | 'listen'
  | 'foryou'
  | 'trending'
  | 'stats'
  | 'nowplaying'
  | 'search'
  | 'library'
  | 'ipod'
  | 'recent'

export type WinPos = { x: number; y: number }

const DEFAULT_POS: Record<WinId, WinPos> = {
  listen: { x: 24, y: 44 },
  foryou: { x: 24, y: 316 },
  trending: { x: 440, y: 316 },
  stats: { x: 868, y: 44 },
  nowplaying: { x: 60, y: 50 },
  search: { x: 240, y: 90 },
  library: { x: 300, y: 120 },
  ipod: { x: 1186, y: 400 },
  recent: { x: 180, y: 70 },
}

const DEFAULT_OPEN: WinId[] = ['listen', 'foryou', 'trending', 'stats', 'ipod']

type DesktopApi = {
  open: Set<WinId>
  order: WinId[]
  pos: Record<WinId, WinPos>
  show: (id: WinId) => void
  hide: (id: WinId) => void
  focus: (id: WinId) => void
  move: (id: WinId, p: WinPos) => void
  zOf: (id: WinId) => number
  reset: () => void
  // The player has two sizes, like iTunes' mini player: the iPod and the big now playing window.
  toIpod: () => void
  toBigPlayer: () => void
}

// Bring a window back on screen if it was dragged away or the browser got smaller.
function onScreen(p: WinPos): WinPos {
  return {
    x: Math.min(Math.max(p.x, 0), Math.max(0, window.innerWidth - 260)),
    y: Math.min(Math.max(p.y, 24), Math.max(24, window.innerHeight - 200)),
  }
}

const DesktopContext = createContext<DesktopApi | null>(null)

export function DesktopProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(
    () => new Set(load<WinId[]>('open', DEFAULT_OPEN)),
  )
  const [order, setOrder] = useState<WinId[]>(() => load('order', DEFAULT_OPEN))
  const [pos, setPos] = useState<Record<WinId, WinPos>>(() => ({
    ...DEFAULT_POS,
    ...load('pos', {}),
  }))

  const focus = useCallback((id: WinId) => {
    setOrder((o) => {
      if (o[o.length - 1] === id) return o
      const next = [...o.filter((w) => w !== id), id]
      save('order', next)
      return next
    })
  }, [])

  const show = useCallback(
    (id: WinId) => {
      setOpen((s) => {
        const next = new Set(s).add(id)
        save('open', [...next])
        return next
      })
      setPos((prev) => {
        const fixed = onScreen(prev[id])
        if (fixed.x === prev[id].x && fixed.y === prev[id].y) return prev
        const next = { ...prev, [id]: fixed }
        save('pos', next)
        return next
      })
      focus(id)
    },
    [focus],
  )

  const hide = useCallback((id: WinId) => {
    setOpen((s) => {
      const next = new Set(s)
      next.delete(id)
      save('open', [...next])
      return next
    })
  }, [])

  const move = useCallback((id: WinId, p: WinPos) => {
    setPos((prev) => {
      const next = { ...prev, [id]: p }
      save('pos', next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setOpen(new Set(DEFAULT_OPEN))
    setOrder(DEFAULT_OPEN)
    setPos(DEFAULT_POS)
    save('open', DEFAULT_OPEN)
    save('order', DEFAULT_OPEN)
    save('pos', DEFAULT_POS)
  }, [])

  const toIpod = useCallback(() => {
    hide('nowplaying')
    show('ipod')
  }, [hide, show])

  const toBigPlayer = useCallback(() => {
    hide('ipod')
    show('nowplaying')
  }, [hide, show])

  const api = useMemo<DesktopApi>(
    () => ({
      open,
      order,
      pos,
      show,
      hide,
      focus,
      move,
      reset,
      toIpod,
      toBigPlayer,
      zOf: (id) => 10 + Math.max(0, order.indexOf(id)),
    }),
    [open, order, pos, show, hide, focus, move, reset, toIpod, toBigPlayer],
  )
  return <DesktopContext value={api}>{children}</DesktopContext>
}

export function useDesktop() {
  const ctx = use(DesktopContext)
  if (!ctx) throw new Error('useDesktop needs DesktopProvider')
  return ctx
}
