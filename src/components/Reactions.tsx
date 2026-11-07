import { usePlayer } from '../state/player.tsx'

// Dislike, like, love for the current song. Love saves to "loved"; it is separate from like.
export function Reactions({ variant }: { variant: 'lcd' | 'aqua' }) {
  const {
    track,
    liked,
    loved,
    disliked,
    toggleLike,
    toggleLove,
    toggleDislike,
  } = usePlayer()
  const items = [
    {
      key: 'dislike',
      glyph: '👎',
      on: disliked.has(track.id),
      act: () => toggleDislike(track.id),
    },
    {
      key: 'like',
      glyph: '👍',
      on: liked.has(track.id),
      act: () => toggleLike(track.id),
    },
    {
      key: 'love',
      glyph: '♥',
      on: loved.has(track.id),
      act: () => toggleLove(track.id),
    },
  ]
  const base =
    variant === 'lcd'
      ? 'rounded-[3px] border border-lcd-ink px-1.5 text-[12px] leading-[18px]'
      : 'aqua-pill rounded-pill border border-hairline px-3 py-0.5 text-[12px]'
  return (
    <div className="flex items-center justify-around gap-2">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={it.act}
          aria-pressed={it.on}
          aria-label={`${it.key} ${track.title}`}
          className={`${base} ${
            it.on
              ? it.key === 'love'
                ? '!border-pink !bg-pink !text-window'
                : it.key === 'dislike'
                  ? '!border-red !bg-red/80'
                  : '!border-aqua-edge !bg-aqua-hi'
              : variant === 'lcd'
                ? 'bg-window/50'
                : ''
          } ${it.key === 'love' && !it.on ? 'text-pink' : ''}`}
        >
          {it.glyph}
        </button>
      ))}
    </div>
  )
}
