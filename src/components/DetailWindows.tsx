import { useEffect, useRef, useState } from 'react'
import { toTrack } from '../data/catalog.ts'
import {
  fmt,
  getTrack,
  registerTracks,
  type Art as ArtKind,
} from '../data/fake.ts'
import type { ArtistData, OutTrack } from '../data/spotify-types.ts'
import { useLyrics } from '../lib/lyrics.ts'
import { ownerFetch, useIsOwner } from '../lib/owner.ts'
import { useJson } from '../lib/useJson.ts'
import { useCatalog } from '../state/catalog.tsx'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { AddToPlaylist } from './AddToPlaylist.tsx'
import { Art } from './Art.tsx'
import { Pill } from './Pill.tsx'
import { TrackList, TrackRow } from './TrackRow.tsx'
import { Window } from './Window.tsx'

// The song and artist pages, opened by clicking a name in any song row.

const art = (url: string, fallback: ArtKind): ArtKind =>
  url.startsWith('https://') ? (url as ArtKind) : fallback

function Heading({ children }: { children: string }) {
  return <h3 className="mt-3 mb-1 text-[11px] text-mute">{children}</h3>
}

// Registers the Spotify songs in an API answer so song rows can show them.
const registerSongs = (d: { tracks?: OutTrack[]; songs?: OutTrack[] }) =>
  registerTracks((d.tracks ?? d.songs ?? []).map(toTrack))
const ids = (list: OutTrack[] | undefined) => (list ?? []).map((t) => t.id)

// Opens an album in the playlist window, loading its songs first.
function useOpenAlbum() {
  const { openCollection } = useDesktop()
  return async (
    id: string,
    title: string,
    subtitle: string,
    image: ArtKind,
  ) => {
    const res = await fetch(`/api/spotify/collection?kind=album&id=${id}`)
    const d = res.ok ? ((await res.json()) as { tracks: OutTrack[] }) : null
    if (!d?.tracks.length) return
    const list = d.tracks.map(toTrack)
    registerTracks(list)
    openCollection({
      id: `album-${id}`,
      kind: 'album',
      title: title.toLowerCase(),
      subtitle: subtitle.toLowerCase(),
      art: image,
      trackIds: list.map((t) => t.id),
    })
  }
}

// How often lea played a song or artist lately (her last 50 plays).
function usePlays() {
  const { recentSongs } = useCatalog()
  return {
    song: (id: string) => recentSongs.filter((r) => r.trackId === id).length,
    artist: (name: string) =>
      recentSongs.filter((r) =>
        getTrack(r.trackId).artist.split(', ').includes(name),
      ).length,
  }
}

export function SongWindow() {
  const { song: id, openArtist, show } = useDesktop()
  const { playRadio, track: current } = usePlayer()
  const plays = usePlays()
  const openAlbum = useOpenAlbum()
  const t = getTrack(id ?? '')
  const real = Boolean(id && t.uri)
  const first = t.artist.split(', ')[0]
  const radio = useJson<{ tracks: OutTrack[] }>(
    real
      ? `/api/spotify/radio?${new URLSearchParams({ track: t.title, artist: first })}`
      : null,
    false,
    registerSongs,
  )
  const artist = useJson<ArtistData>(
    real ? `/api/spotify/artist?name=${encodeURIComponent(first)}` : null,
    false,
    registerSongs,
  )
  const similar = ids(radio.data?.tracks.slice(0, 5))
  const more = ids(artist.data?.songs.filter((s) => s.id !== id).slice(0, 4))
  const { lines } = useLyrics(t)
  if (!id) return null
  const played = plays.song(id)

  return (
    <Window
      id="song"
      title={`${t.title} — ${t.artist}`}
      width={640}
      height={520}
      bodyClassName="flex gap-5 max-[900px]:flex-col"
    >
      <div className="w-[200px] shrink-0 text-center max-[900px]:w-full">
        <Art
          art={t.art}
          size={200}
          className="mx-auto shadow-[0_6px_16px_rgb(0_0_0/0.25)]"
        />
        <h3 className="mt-3 text-[20px] leading-tight font-normal text-ink">
          {t.title}
        </h3>
        <p className="text-[13px]">
          {t.artist.split(', ').map((name, i) => (
            <span key={name}>
              {i > 0 && ', '}
              <button
                type="button"
                onClick={() => openArtist(name)}
                className="text-aqua-deep underline underline-offset-2"
              >
                {name}
              </button>
            </span>
          ))}
        </p>
        <p className="text-[11px] text-mute">
          {t.albumId ? (
            <button
              type="button"
              onClick={() =>
                void openAlbum(
                  t.albumId!,
                  t.album,
                  `album · ${t.artist}`,
                  t.art,
                )
              }
              className="underline underline-offset-2"
            >
              {t.album}
            </button>
          ) : (
            t.album
          )}
          {t.year ? ` · ${t.year}` : ''} · {fmt(t.duration)}
        </p>
        <div className="mt-3 flex items-center justify-center gap-1.5">
          <Pill className="aqua-gel" onClick={() => playRadio(id)}>
            ▶ play
          </Pill>
          <AddToPlaylist id={id} />
        </div>
        <p className="mt-3 text-[11px] text-mute">
          {played
            ? `you played it ${played} time${played > 1 ? 's' : ''} lately`
            : 'not in your recent plays'}
          <br />
          after it ends, similar songs keep playing
        </p>
      </div>

      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        <Heading>lyrics</Heading>
        <p className="text-[12px] leading-relaxed text-body">
          {lines.length
            ? lines
                .filter((l) => l.text.trim())
                .slice(0, 3)
                .map((l, i) => (
                  <span key={i} className="block">
                    {l.text}
                  </span>
                ))
            : 'no lyrics for this one'}
        </p>
        {current.id === id && lines.length > 0 && (
          <button
            type="button"
            onClick={() => show('nowplaying')}
            className="text-[11px] text-mute underline underline-offset-2"
          >
            open in lyrics ↗
          </button>
        )}
        {real && (
          <>
            <Heading>similar songs</Heading>
            {radio.loading ? (
              <p className="text-mute">finding similar songs…</p>
            ) : (
              <TrackList label="similar songs">
                {similar.map((s) => (
                  <TrackRow key={s} id={s} onPlay={() => playRadio(s)} />
                ))}
              </TrackList>
            )}
            <Heading>{`more from ${first}`}</Heading>
            <TrackList label={`more from ${first}`}>
              {more.map((s) => (
                <TrackRow key={s} id={s} onPlay={() => playRadio(s)} />
              ))}
            </TrackList>
          </>
        )}
      </div>
    </Window>
  )
}

function MoreMenu({ items }: { items: { label: string; run: () => void }[] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: Event) => {
      if (e.type === 'keydown' && (e as KeyboardEvent).key !== 'Escape') return
      if (e.type === 'pointerdown' && ref.current?.contains(e.target as Node))
        return
      setOpen(false)
    }
    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])
  return (
    <div ref={ref} className="relative">
      <Pill
        onClick={() => setOpen(!open)}
        aria-label="more options"
        aria-haspopup="menu"
        aria-expanded={open}
        className="!px-2"
      >
        •••
      </Pill>
      {open && (
        <div
          role="menu"
          className="absolute top-full left-0 z-20 mt-1 w-[190px] rounded-[5px] border border-hairline bg-window/95 py-1 text-[12px] shadow-window"
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                it.run()
                setOpen(false)
              }}
              className="block w-full px-3 py-1 text-left text-ink hover:bg-selection hover:text-window"
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// Follows the artist on lea's Spotify account. Anyone can follow; only lea's browser can unfollow.
function FollowButton({ data }: { data: ArtistData }) {
  const owner = useIsOwner()
  const [state, setState] = useState<{ id: string; on: boolean } | null>(null)
  const on = state?.id === data.id ? state.on : !!data.following
  if (data.following === null)
    return (
      <a
        href={data.url}
        target="_blank"
        rel="noreferrer"
        className="aqua-pill rounded-pill border border-hairline px-3 py-0.5 text-[11px] whitespace-nowrap text-ink"
      >
        follow on spotify ↗
      </a>
    )
  const toggle = () => {
    const next = !on
    setState({ id: data.id, on: next })
    void ownerFetch(`/api/spotify/artist?id=${data.id}`, {
      method: next ? 'PUT' : 'DELETE',
    })
      .then((r) => r.ok)
      .catch(() => false)
      .then((ok) => !ok && setState({ id: data.id, on: !next }))
  }
  return (
    <Pill
      pressed={on}
      onClick={toggle}
      disabled={on && !owner}
      title={on && !owner ? 'lea follows them' : undefined}
    >
      {on ? '✓ following' : '+ follow'}
    </Pill>
  )
}

export function ArtistWindow() {
  const { artist: name, openArtist } = useDesktop()
  const { playQueue, playRadio, setShuffle } = usePlayer()
  const { stats, source } = useCatalog()
  const owner = useIsOwner()
  const plays = usePlays()
  const openAlbum = useOpenAlbum()
  const [moreBio, setMoreBio] = useState('')
  const { data, loading } = useJson<ArtistData>(
    name && source === 'spotify'
      ? `/api/spotify/artist?name=${encodeURIComponent(name)}${owner ? '&me=1' : ''}`
      : null,
    owner,
    registerSongs,
  )
  const songs = ids(data?.songs)
  if (!name) return null
  const rank = stats['4w'].topArtists.findIndex(
    (a) => a.name.toLowerCase() === name.toLowerCase(),
  )
  const played = plays.artist(name)
  const facts = [
    rank >= 0 && `#${rank + 1} in your top artists · 4 weeks`,
    played > 0 && `${played} plays lately`,
  ].filter(Boolean)

  return (
    <Window id="artist" title={name} width={640} height={560}>
      <div className="flex items-center gap-4">
        <Art
          art={art(data?.image ?? '', 'art-3')}
          size={120}
          round
          className="shadow-[0_4px_12px_rgb(0_0_0/0.2)]"
        />
        <div className="min-w-0">
          <p className="text-[11px] text-mute">artist</p>
          <h3 className="truncate text-[28px] leading-tight font-normal text-ink">
            {(data?.name ?? name).toLowerCase()}
          </h3>
          {data?.listeners != null && (
            <p className="text-[12px] text-body">
              {data.listeners.toLocaleString()} listeners on last.fm
            </p>
          )}
          {facts.length > 0 && (
            <p className="text-[11px] text-mute">{facts.join(' · ')}</p>
          )}
          {data && (
            <div className="mt-2 flex items-center gap-1.5">
              <Pill
                className="aqua-gel"
                disabled={!songs.length}
                onClick={() => {
                  setShuffle(false)
                  playQueue(songs, 0)
                }}
              >
                ▶ play
              </Pill>
              <Pill
                disabled={!songs.length}
                onClick={() => {
                  playQueue(songs, Math.floor(Math.random() * songs.length))
                  setShuffle(true)
                }}
              >
                ⇄ shuffle
              </Pill>
              <FollowButton data={data} />
              <MoreMenu
                items={[
                  ...(songs.length
                    ? [
                        {
                          label: '≋ start artist radio',
                          run: () => playRadio(songs[0]),
                        },
                      ]
                    : []),
                  {
                    label: '↗ open in spotify',
                    run: () => window.open(data.url, '_blank', 'noreferrer'),
                  },
                  {
                    label: '⧉ copy link',
                    run: () => void navigator.clipboard?.writeText(data.url),
                  },
                ]}
              />
            </div>
          )}
        </div>
      </div>

      {source !== 'spotify' && (
        <p className="mt-4 text-mute">
          artist pages need the spotify connection.
        </p>
      )}
      {loading && <p className="mt-4 text-mute">loading…</p>}
      {source === 'spotify' && !loading && !data && (
        <p className="mt-4 text-mute">couldn’t find {name} on spotify.</p>
      )}

      {data && (
        <div className="flex gap-5 max-[900px]:flex-col">
          <div className="min-w-0 flex-1">
            <Heading>popular songs</Heading>
            <TrackList label="popular songs">
              {songs.map((s, i) => (
                <TrackRow
                  key={s}
                  id={s}
                  rank={i + 1}
                  onPlay={() => {
                    setShuffle(false)
                    playQueue(songs, i)
                  }}
                  trailing={
                    <span className="text-[11px] text-mute tabular-nums">
                      {fmt(getTrack(s).duration)}
                    </span>
                  }
                />
              ))}
            </TrackList>
          </div>
          <div className="w-[200px] shrink-0 max-[900px]:w-full">
            {data.albums.length > 0 && (
              <>
                <Heading>albums & singles</Heading>
                <ul className="grid grid-cols-2 gap-2.5">
                  {data.albums.slice(0, 6).map((al) => (
                    <li key={al.id}>
                      <button
                        type="button"
                        onClick={() =>
                          void openAlbum(
                            al.id,
                            al.title,
                            `${al.subtitle} · ${data.name}`,
                            art(al.image, 'art-6'),
                          )
                        }
                        className="block w-full text-left"
                      >
                        <Art art={art(al.image, 'art-6')} size={92} />
                        <span className="mt-1 block truncate text-[12px] text-ink">
                          {al.title.toLowerCase()}
                        </span>
                        <span className="block truncate text-[11px] text-mute">
                          {al.subtitle.toLowerCase()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {(data.listeners != null || data.bio) && (
              <>
                <Heading>about</Heading>
                <div className="rounded-art border border-hairline bg-stripe p-2.5">
                  {data.listeners != null && (
                    <p className="text-[12px] text-ink">
                      <b>{data.listeners.toLocaleString()}</b> listeners on
                      last.fm
                    </p>
                  )}
                  {data.bio && (
                    <p
                      className={`mt-1 text-[11px] leading-relaxed text-body ${moreBio === data.id ? '' : 'line-clamp-4'}`}
                    >
                      {data.bio}
                    </p>
                  )}
                  {data.bio.length > 160 && moreBio !== data.id && (
                    <button
                      type="button"
                      onClick={() => setMoreBio(data.id)}
                      className="text-[11px] text-aqua-deep"
                    >
                      more
                    </button>
                  )}
                </div>
              </>
            )}
            {data.similar.length > 0 && (
              <>
                <Heading>fans also like</Heading>
                <div className="flex flex-wrap gap-1.5">
                  {data.similar.map((n) => (
                    <Pill key={n} onClick={() => openArtist(n.toLowerCase())}>
                      {n.toLowerCase()}
                    </Pill>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </Window>
  )
}
