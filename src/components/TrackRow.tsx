import type { ReactNode } from 'react'
import { getTrack } from '../data/fake.ts'
import { usePlayer } from '../state/player.tsx'
import { AddToPlaylist } from './AddToPlaylist.tsx'
import { Art } from './Art.tsx'

export function TrackList({
  children,
  label,
}: {
  children: ReactNode
  label: string
}) {
  return (
    <ol
      aria-label={label}
      className="flex flex-col [&>li:nth-child(even)]:bg-stripe"
    >
      {children}
    </ol>
  )
}

export function TrackRow({
  id,
  rank,
  trailing,
}: {
  id: string
  rank?: number
  trailing?: ReactNode
}) {
  const {
    track: current,
    playing,
    playTrack,
    loved,
    toggleLove,
    disliked,
  } = usePlayer()
  const t = getTrack(id)
  const isCurrent = current.id === id
  const isLoved = loved.has(id)
  return (
    <li
      className={`flex items-center gap-2.5 px-1.5 py-1 ${disliked.has(id) ? 'opacity-40' : ''}`}
    >
      {rank !== undefined && (
        <span className="w-4 text-right text-[11px] text-mute tabular-nums">
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <button
        type="button"
        onClick={() => playTrack(id)}
        className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        aria-label={`play ${t.title} by ${t.artist}`}
      >
        <Art art={t.art} size={30} />
        <span className="min-w-0 flex-1">
          <span
            className={`block truncate ${isCurrent ? 'font-bold text-selection' : 'text-ink'}`}
          >
            {isCurrent && playing ? '▶ ' : ''}
            {t.title}
          </span>
          <span className="block truncate text-[11px] text-mute">
            {t.artist}
          </span>
        </span>
      </button>
      {trailing}
      <AddToPlaylist id={id} />
      <button
        type="button"
        onClick={() => toggleLove(id)}
        aria-label={isLoved ? `unlove ${t.title}` : `love ${t.title}`}
        aria-pressed={isLoved}
        className={`grid size-6 place-items-center rounded-full text-[14px] ${isLoved ? 'text-pink' : 'text-mute hover:text-pink'}`}
      >
        {isLoved ? '♥' : '♡'}
      </button>
    </li>
  )
}
