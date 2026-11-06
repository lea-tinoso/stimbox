import type { ReactNode } from 'react'
import { getTrack } from '../data/fake.ts'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { AddToPlaylist } from './AddToPlaylist.tsx'
import { ArtistLinks } from './ArtistLinks.tsx'
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
  onPlay,
}: {
  id: string
  rank?: number
  trailing?: ReactNode
  // Defaults to slotting the song into the current queue.
  onPlay?: () => void
}) {
  const {
    track: current,
    playing,
    playTrack,
    loved,
    toggleLove,
    disliked,
  } = usePlayer()
  const { openSong } = useDesktop()
  const t = getTrack(id)
  const isCurrent = current.id === id
  const isLoved = loved.has(id)
  return (
    <li
      className={`relative flex items-center gap-2.5 px-1.5 py-1 ${disliked.has(id) ? 'opacity-40' : ''}`}
    >
      {/* The whole row plays the song; the names on top of it open their pages. */}
      <button
        type="button"
        onClick={onPlay ?? (() => playTrack(id))}
        className="absolute inset-0 z-0 cursor-default"
        aria-label={`play ${t.title} by ${t.artist}`}
      />
      {rank !== undefined && (
        <span className="w-4 text-right text-[11px] text-mute tabular-nums">
          {String(rank).padStart(2, '0')}
        </span>
      )}
      <Art art={t.art} size={30} />
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate ${isCurrent ? 'font-bold text-selection' : 'text-ink'}`}
        >
          {isCurrent && playing ? '▶ ' : ''}
          <button
            type="button"
            onClick={() => openSong(id)}
            className="relative z-10 max-w-full truncate text-left align-top hover:underline"
          >
            {t.title}
          </button>
        </span>
        <span className="block truncate text-[11px] text-mute">
          <ArtistLinks artist={t.artist} />
        </span>
      </span>
      <span className="relative z-10 flex items-center gap-2.5">
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
      </span>
    </li>
  )
}
