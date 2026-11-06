import type { ReactNode } from 'react'
import { useDrag } from '../lib/useDrag.ts'
import { useCompact } from '../lib/useMedia.ts'
import { useDesktop, type WinId } from '../state/desktop.tsx'

type Props = {
  id: WinId
  title: string
  width: number
  height?: number
  children: ReactNode
  bodyClassName?: string
  // Red light. Defaults to closing the window into the dock.
  onClose?: () => void
  // Yellow light. Defaults to closing the window into the dock.
  onMinimize?: () => void
  // Green light. Without it the light is decoration, as on a window that can't grow.
  onZoom?: () => void
}

export function Window({
  id,
  title,
  width,
  height,
  children,
  bodyClassName = '',
  onClose,
  onMinimize,
  onZoom,
}: Props) {
  const { pos, open, hide, focus, zOf, order } = useDesktop()
  const drag = useDrag(id)
  const compact = useCompact()
  if (!open.has(id)) return null
  const active = order[order.length - 1] === id

  return (
    <section
      aria-label={title}
      onPointerDown={() => focus(id)}
      className={`flex flex-col overflow-hidden rounded-t-window rounded-b-sm border border-hairline bg-window shadow-window ${
        compact ? 'relative w-full shrink-0' : 'absolute'
      }`}
      style={
        compact
          ? undefined
          : { left: pos[id].x, top: pos[id].y, width, height, zIndex: zOf(id) }
      }
    >
      <header
        {...(compact ? {} : drag)}
        className={`aqua-titlebar flex h-6 shrink-0 touch-none items-center border-b border-hairline px-2 select-none ${
          compact ? '' : 'cursor-grab active:cursor-grabbing'
        }`}
      >
        <div className="group flex gap-2">
          <button
            type="button"
            aria-label={`close ${title}`}
            onClick={onClose ?? (() => hide(id))}
            className={`light size-[13px] rounded-full ${active ? 'text-light-red' : 'text-chrome-lo'}`}
          />
          <button
            type="button"
            aria-label={`minimize ${title}`}
            onClick={onMinimize ?? (() => hide(id))}
            className={`light size-[13px] rounded-full ${active ? 'text-light-yellow' : 'text-chrome-lo'}`}
          />
          {onZoom ? (
            <button
              type="button"
              aria-label={`zoom ${title}`}
              onClick={onZoom}
              className={`light size-[13px] rounded-full ${active ? 'text-light-green' : 'text-chrome-lo'}`}
            />
          ) : (
            <span
              aria-hidden
              className={`light size-[13px] rounded-full ${active ? 'text-light-green' : 'text-chrome-lo'}`}
            />
          )}
        </div>
        <h2
          className={`flex-1 truncate pr-14 text-center text-[13px] font-normal ${active ? 'text-ink' : 'text-mute'}`}
        >
          {title}
        </h2>
      </header>
      <div
        className={`overflow-auto p-3 ${compact ? 'max-h-[75vh]' : 'min-h-0 flex-1'} ${bodyClassName}`}
      >
        {children}
      </div>
    </section>
  )
}
