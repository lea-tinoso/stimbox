import type { Art as ArtKey } from '../data/fake.ts'

export function Art({
  art,
  size,
  round = false,
  className = '',
}: {
  art: ArtKey
  size: number
  round?: boolean
  className?: string
}) {
  const shape = `block shrink-0 border border-ink/25 ${round ? 'rounded-full' : 'rounded-art'} ${className}`
  if (art.startsWith('https://'))
    return (
      <img
        src={art}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        className={`${shape} bg-chrome-lo object-cover`}
        style={{ width: size, height: size }}
      />
    )
  return (
    <span
      aria-hidden
      className={`${art} ${shape}`}
      style={{ width: size, height: size }}
    />
  )
}
