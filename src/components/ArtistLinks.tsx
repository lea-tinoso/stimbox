import { Fragment } from 'react'
import { useDesktop } from '../state/desktop.tsx'

// "a, b" as one link per artist, each opening that artist's page.
export function ArtistLinks({
  artist,
  className = 'hover:text-ink hover:underline',
}: {
  artist: string
  className?: string
}) {
  const { openArtist } = useDesktop()
  return artist.split(', ').map((name, i) => (
    <Fragment key={name}>
      {i > 0 && ', '}
      <button
        type="button"
        onClick={() => openArtist(name)}
        className={`relative z-10 align-top ${className}`}
      >
        {name}
      </button>
    </Fragment>
  ))
}
