import { useEffect, useState } from 'react'
import { useMedia } from '../lib/useMedia.ts'

// An Aqua chat bubble that types its text, waits, then types it again. Still for reduced motion.
export function TypingBubble({
  text,
  className = '',
}: {
  text: string
  className?: string
}) {
  const still = useMedia('(prefers-reduced-motion: reduce)')
  const [shown, setShown] = useState(0)

  useEffect(() => {
    if (still) return
    let n = 0
    let timer = 0
    const tick = () => {
      n = n >= text.length ? 0 : n + 1
      setShown(n)
      const done = n === text.length
      timer = window.setTimeout(
        tick,
        done ? 4000 : n === 0 ? 600 : 55 + Math.random() * 70,
      )
    }
    timer = window.setTimeout(tick, 800)
    return () => window.clearTimeout(timer)
  }, [text, still])

  const visible = still ? text : text.slice(0, shown)
  return (
    <div className={`aqua-bubble isolate px-4 py-2.5 ${className}`}>
      <svg
        aria-hidden
        viewBox="0 0 16 16"
        width={16}
        height={16}
        className="aqua-bubble-tail absolute -right-[7px] -bottom-[1px]"
      >
        <path d="M1 1 C 3 9 7 13 15 15 C 9 15.5 4 14 0.5 11" />
      </svg>
      <p className="relative text-[14px] leading-snug text-ink">
        {visible}
        {!still && (
          <span
            aria-hidden
            className="type-caret ml-px inline-block h-[1.05em] w-px translate-y-[2px] bg-ink"
          />
        )}
        {/* Reserve the full height so the bubble doesn't grow while typing. */}
        <span aria-hidden className="invisible">
          {text.slice(visible.length)}
        </span>
      </p>
    </div>
  )
}
