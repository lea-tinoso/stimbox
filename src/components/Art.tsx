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
  return (
    <span
      aria-hidden
      className={`${art} block shrink-0 border border-ink/25 ${round ? 'rounded-full' : 'rounded-art'} ${className}`}
      style={{ width: size, height: size }}
    />
  )
}
