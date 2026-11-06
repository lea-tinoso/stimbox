import { memo, useSyncExternalStore } from 'react'

// heyclicky's "the dream" wallpaper: a rainbow wave of stacked folders on off-white.
// Colors here are generated hues for decoration only, so they live in the SVG, not in the theme.

const subscribe = (cb: () => void) => {
  window.addEventListener('resize', cb)
  return () => window.removeEventListener('resize', cb)
}
const getSize = () => `${window.innerWidth}x${window.innerHeight}`

function Folder({
  hue,
  x,
  y,
  w,
  op,
}: {
  hue: number
  x: number
  y: number
  w: number
  op: number
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${w / 54})`} opacity={op}>
      <path
        d="M2 8a4 4 0 0 1 4-4h14l5 5h23a4 4 0 0 1 4 4v25a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"
        fill={`hsl(${hue} 70% 60%)`}
      />
      <path
        d="M2 15h50v23a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"
        fill={`hsl(${hue} 85% 72%)`}
      />
      <path d="M2 15h50v4H2z" fill={`hsl(${hue} 90% 80%)`} />
    </g>
  )
}

export const Wallpaper = memo(function Wallpaper() {
  const size = useSyncExternalStore(subscribe, getSize, () => '1440x900')
  const [W, H] = size.split('x').map(Number)
  const compact = W < 900
  const fw = compact ? 56 : 84
  const n = compact ? 44 : 80
  const mid = H * (compact ? 0.5 : 0.56)
  const amp = H * 0.31
  const folders = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1)
    const xn = -0.06 + t * 1.12
    const y = mid - amp * Math.cos(2 * Math.PI * (xn - 0.5) * 1.3)
    const hue = t < 0.5 ? (270 + t * 2 * 90) % 360 : 130 - (t - 0.5) * 2 * 85
    const edge = Math.min(1, Math.min(t, 1 - t) * 7)
    return (
      <Folder
        key={i}
        hue={hue}
        x={xn * W}
        y={y}
        w={fw}
        op={0.35 + 0.65 * edge}
      />
    )
  })
  return (
    <svg
      aria-hidden
      className="pointer-events-none fixed inset-0 h-full w-full"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
    >
      <g style={{ filter: 'drop-shadow(0 2px 2px rgb(0 0 0 / 0.12))' }}>
        {folders}
      </g>
    </svg>
  )
})
