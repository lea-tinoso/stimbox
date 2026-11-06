import { useCallback, useRef, type PointerEvent } from 'react'
import { useDesktop, type WinId } from '../state/desktop.tsx'

// Drag a desktop item by a handle. Keeps it on screen, below the menu bar.
export function useDrag(id: WinId) {
  const { pos, move, focus } = useDesktop()
  const start = useRef<{ px: number; py: number; x: number; y: number } | null>(
    null,
  )

  const onPointerDown = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('button, input'))
        return
      focus(id)
      start.current = {
        px: e.clientX,
        py: e.clientY,
        x: pos[id].x,
        y: pos[id].y,
      }
      e.currentTarget.setPointerCapture(e.pointerId)
    },
    [focus, id, pos],
  )

  const onPointerMove = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      const s = start.current
      if (!s) return
      const x = Math.min(
        window.innerWidth - 80,
        Math.max(-200, s.x + e.clientX - s.px),
      )
      const y = Math.min(
        window.innerHeight - 60,
        Math.max(24, s.y + e.clientY - s.py),
      )
      move(id, { x, y })
    },
    [id, move],
  )

  const onPointerUp = useCallback(() => {
    start.current = null
  }, [])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel: onPointerUp,
  }
}
