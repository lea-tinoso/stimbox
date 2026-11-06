import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { toTrack } from '../data/catalog.ts'
import {
  currentLine,
  fmt,
  getTrack,
  registerTracks,
  tracks,
  type Art as ArtKind,
  type Collection,
} from '../data/fake.ts'
import type { ArtistData, OutResult } from '../data/spotify-types.ts'
import { loadCollection } from '../lib/loadCollection.ts'
import { useLyrics } from '../lib/lyrics.ts'
import { recentSearches, useRecentSearches } from '../lib/recentSearches.ts'
import { useJson } from '../lib/useJson.ts'
import { useSearch } from '../lib/useSearch.ts'
import { useTrending, type Region } from '../lib/useTrending.ts'
import { useCatalog } from '../state/catalog.tsx'
import { usePlayer } from '../state/player.tsx'
import { usePlaylists } from '../state/playlists.tsx'
import { Art } from './Art.tsx'

// On phones the whole app is one iPod filling the screen. Its screen is an iPod menu: tap a row,
// or turn the click wheel to move and press the center to open. MENU goes back.

type Screen =
  | { id: 'menu' }
  | { id: 'now' }
  | { id: 'search' }
  | { id: 'about' }
  | { id: 'algorithm' }
  | { id: 'trending' }
  | { id: 'library' }
  | { id: 'artists' }
  | { id: 'collections'; title: string; list: Collection[] }
  | { id: 'collection'; c: Collection }
  | { id: 'songs'; title: string; ids: string[] }
  | { id: 'artist'; name: string }
  | { id: 'chart'; region: Region; title: string }

type Row = {
  key: string
  label: string
  sub?: string
  art?: ArtKind
  round?: boolean
  go: () => void
}

type SearchTab = 'all' | 'songs' | 'playlists' | 'albums' | 'artists'

const asArt = (url: string, fallback: ArtKind): ArtKind =>
  url.startsWith('https://') ? (url as ArtKind) : fallback

function title(s: Screen) {
  switch (s.id) {
    case 'menu':
      return 'stimbox'
    case 'now':
      return 'now playing'
    case 'algorithm':
      return 'your algorithm'
    case 'artists':
      return 'top artists'
    case 'collections':
    case 'songs':
    case 'chart':
      return s.title
    case 'collection':
      return s.c.title
    case 'artist':
      return s.name
    default:
      return s.id
  }
}

// Turning a finger around the wheel: one step every 24 degrees, clockwise = down.
function useWheel(onStep: (dir: 1 | -1) => void) {
  const st = useRef({ down: false, a: 0, acc: 0, turned: false })
  const angle = (e: PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return (
      (Math.atan2(
        e.clientY - (r.top + r.height / 2),
        e.clientX - (r.left + r.width / 2),
      ) *
        180) /
      Math.PI
    )
  }
  return {
    onPointerDown: (e: PointerEvent<HTMLElement>) => {
      st.current = { down: true, a: angle(e), acc: 0, turned: false }
    },
    onPointerMove: (e: PointerEvent<HTMLElement>) => {
      const s = st.current
      if (!s.down) return
      const a = angle(e)
      let d = a - s.a
      if (d > 180) d -= 360
      if (d < -180) d += 360
      s.a = a
      s.acc += d
      while (Math.abs(s.acc) >= 24) {
        const dir = s.acc > 0 ? 1 : -1
        s.acc -= dir * 24
        s.turned = true
        onStep(dir)
      }
    },
    onPointerUp: () => {
      st.current.down = false
    },
    onPointerCancel: () => {
      st.current.down = false
    },
    // A turn that started on a button shouldn't also press it.
    onClickCapture: (e: { stopPropagation: () => void }) => {
      if (st.current.turned) e.stopPropagation()
      st.current.turned = false
    },
  }
}

export function PhoneIPod() {
  const p = usePlayer()
  const catalog = useCatalog()
  const { playlists } = usePlaylists()
  const [stack, setStack] = useState<{ s: Screen; sel: number }[]>([
    { s: { id: 'menu' }, sel: 0 },
  ])
  const top = stack[stack.length - 1]
  const screen = top.s
  const [query, setQuery] = useState('')
  const [tab, setTab] = useState<SearchTab>('all')
  const [blocked, setBlocked] = useState<Set<string>>(new Set())
  const [opening, setOpening] = useState('')
  const recent = useRecentSearches()

  const push = (s: Screen) => setStack((st) => [...st, { s, sel: 0 }])
  const back = () => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st))
  const setSel = (sel: number) =>
    setStack((st) => [...st.slice(0, -1), { ...st[st.length - 1], sel }])
  const nowPlaying = () => push({ id: 'now' })

  const q = screen.id === 'search' ? query.trim().toLowerCase() : ''
  const found = useSearch(q)
  const demo = 'demo' in found ? found.demo : undefined
  const artistName = screen.id === 'artist' ? screen.name : null
  const artist = useJson<ArtistData>(
    artistName && catalog.source === 'spotify'
      ? `/api/spotify/artist?name=${encodeURIComponent(artistName)}`
      : null,
    false,
    (d) => registerTracks(d.songs.map(toTrack)),
  )

  const chart = useTrending(screen.id === 'chart' ? screen.region : 'ph')
  const songRow = (id: string, go: () => void, sub?: string): Row => {
    const t = getTrack(id)
    return { key: id, label: t.title, sub: sub ?? t.artist, art: t.art, go }
  }
  const songRows = (ids: string[]) =>
    ids.map((id, i) =>
      songRow(id, () => {
        p.playQueue(ids, i)
        nowPlaying()
      }),
    )
  const collectionRow = (c: Collection): Row => ({
    key: c.id,
    label: c.title,
    sub: `${c.subtitle ? `${c.subtitle} · ` : ''}${c.trackIds.length} songs`,
    art: c.art,
    go: () => push({ id: 'collection', c }),
  })
  const resultRow = (r: OutResult): Row => {
    const key = `${r.kind}-${r.id}`
    return {
      key,
      label: r.title.toLowerCase(),
      sub: blocked.has(key)
        ? 'spotify doesn’t let new apps open this one'
        : opening === key
          ? 'opening…'
          : r.kind === 'artist'
            ? 'artist'
            : r.subtitle.toLowerCase(),
      art: demo?.find((c) => c.id === r.id)?.art ?? asArt(r.image, 'art-6'),
      round: r.kind === 'artist',
      go: () => {
        recentSearches.add(q)
        if (r.kind === 'artist')
          return push({ id: 'artist', name: r.title.toLowerCase() })
        const local = demo?.find((c) => c.id === r.id)
        if (local) return push({ id: 'collection', c: local })
        setOpening(key)
        void loadCollection(r).then((c) => {
          setOpening('')
          if (c) push({ id: 'collection', c })
          else setBlocked((b) => new Set(b).add(key))
        })
      },
    }
  }

  const rows = ((): Row[] => {
    const s = screen
    const menu = (items: [string, () => void, string?][]): Row[] =>
      items.map(([label, go, sub]) => ({ key: label, label, go, sub }))
    switch (s.id) {
      case 'menu':
        return menu([
          ['now playing', nowPlaying, p.track.title],
          ['search', () => push({ id: 'search' })],
          [
            'listen again',
            () =>
              push({
                id: 'collections',
                title: 'listen again',
                list: catalog.listenAgain,
              }),
          ],
          [
            'for you',
            () =>
              push({
                id: 'collections',
                title: 'for you',
                list: catalog.forYouPlaylists,
              }),
          ],
          [
            'playlists',
            () =>
              push({
                id: 'collections',
                title: 'playlists',
                list: [
                  ...(catalog.spotifyPlaylists.length
                    ? catalog.spotifyPlaylists
                    : catalog.recentCollections.filter(
                        (c) => c.kind === 'playlist',
                      )),
                  ...playlists.map((pl): Collection => ({
                    id: pl.id,
                    kind: 'playlist',
                    title: pl.title,
                    subtitle: 'made here',
                    art: pl.art,
                    trackIds: pl.trackIds,
                  })),
                ],
              }),
          ],
          ['your algorithm', () => push({ id: 'algorithm' })],
          ['trending', () => push({ id: 'trending' })],
          ['library', () => push({ id: 'library' })],
          ['about', () => push({ id: 'about' })],
        ])
      case 'collections':
        return s.list.map(collectionRow)
      case 'collection':
        return [
          {
            key: 'play',
            label: '▶ play all',
            go: () => {
              p.setShuffle(false)
              p.playQueue(s.c.trackIds)
              nowPlaying()
            },
          },
          {
            key: 'shuffle',
            label: '⤨ shuffle',
            go: () => {
              p.setShuffle(true)
              p.playQueue(s.c.trackIds)
              nowPlaying()
            },
          },
          ...songRows(s.c.trackIds),
        ]
      case 'songs':
        return songRows(s.ids)
      case 'algorithm': {
        const st = catalog.stats['4w']
        return menu([
          ['top artists', () => push({ id: 'artists' })],
          [
            'on repeat',
            () =>
              push({
                id: 'songs',
                title: 'on repeat',
                ids: st.onRepeat.map((r) => r.trackId),
              }),
          ],
          [
            'recently played',
            () =>
              push({
                id: 'songs',
                title: 'recently played',
                ids: [...new Set(catalog.recentSongs.map((r) => r.trackId))],
              }),
          ],
        ])
      }
      case 'artists':
        return catalog.stats['4w'].topArtists.map((a, i) => ({
          key: a.name,
          label: a.name,
          sub: `#${i + 1} · last 4 weeks`,
          art: a.art,
          round: true,
          go: () => push({ id: 'artist', name: a.name }),
        }))
      case 'trending':
        return (
          [
            ['philippines', 'ph'],
            ['asia', 'asia'],
            ['world', 'world'],
          ] as const
        ).map(([label, k]) => ({
          key: k,
          label,
          go: () =>
            push({ id: 'chart', region: k, title: `trending · ${label}` }),
        }))
      case 'chart':
        return songRows(chart.entries.map((e) => e.trackId))
      case 'library':
        return menu([
          [
            'loved',
            () => push({ id: 'songs', title: 'loved', ids: [...p.loved] }),
            `${p.loved.size} songs`,
          ],
          [
            'liked',
            () => push({ id: 'songs', title: 'liked', ids: [...p.liked] }),
            `${p.liked.size} songs`,
          ],
        ])
      case 'artist': {
        const ids = artist.data
          ? artist.data.songs.map((t) => t.id)
          : tracks
              .filter((t) => t.artist.split(', ').includes(s.name))
              .map((t) => t.id)
        const listeners = artist.data?.listeners
        return [
          {
            key: 'radio',
            label: '▶ artist radio',
            sub:
              listeners != null
                ? `${listeners.toLocaleString()} listeners on last.fm`
                : undefined,
            go: () => {
              if (!ids.length) return
              p.playRadio(ids[0])
              nowPlaying()
            },
          },
          ...songRows(ids),
          ...(artist.data?.albums ?? []).map(resultRow),
        ]
      }
      case 'search': {
        if (!q)
          return recent.map((r) => ({
            key: r,
            label: `↺ ${r}`,
            go: () => setQuery(r),
          }))
        const songs = found.ids.map((id) =>
          songRow(id, () => {
            recentSearches.add(q)
            p.playRadio(id)
            nowPlaying()
          }),
        )
        const tagged = (list: OutResult[], what: string) =>
          list.map((r) => {
            const row = resultRow(r)
            return {
              ...row,
              sub:
                row.sub === r.subtitle.toLowerCase() &&
                !row.sub.startsWith(what)
                  ? `${what} · ${row.sub}`
                  : row.sub,
            }
          })
        if (tab === 'songs') return songs
        if (tab === 'playlists') return tagged(found.playlists, 'playlist')
        if (tab === 'albums') return tagged(found.albums, 'album')
        if (tab === 'artists') return found.artists.map(resultRow)
        return [
          ...songs.slice(0, 5),
          ...found.artists.slice(0, 2).map(resultRow),
          ...tagged(found.playlists.slice(0, 3), 'playlist'),
          ...tagged(found.albums.slice(0, 3), 'album'),
        ]
      }
      default:
        return []
    }
  })()

  const sel = Math.min(top.sel, Math.max(0, rows.length - 1))
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    listRef.current
      ?.querySelector('[data-sel]')
      ?.scrollIntoView({ block: 'nearest' })
  }, [sel, stack.length])

  const wheel = useWheel((dir) => {
    if (screen.id === 'now')
      p.seek(Math.min(p.length, Math.max(0, p.position + dir * 5)))
    else if (rows.length)
      setSel(Math.min(rows.length - 1, Math.max(0, sel + dir)))
  })
  const center = () => {
    if (screen.id === 'now') p.toggle()
    else rows[sel]?.go()
  }

  return (
    <div className="fixed inset-0 flex bg-desk p-2 pt-[max(8px,env(safe-area-inset-top))] pb-[max(8px,env(safe-area-inset-bottom))]">
      <h1 className="sr-only">stimbox</h1>
      <section
        aria-label="ipod"
        className="ipod-body flex min-w-0 flex-1 flex-col rounded-[34px] border border-hairline p-4 select-none"
      >
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border-2 border-lcd-ink/80 bg-lcd text-lcd-ink">
          <header className="lcd-bar grid h-8 shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center border-b border-lcd-ink/60 text-[14px] font-bold">
            {stack.length > 1 ? (
              <button
                type="button"
                onClick={back}
                aria-label="back"
                className="h-full text-[18px]"
              >
                ‹
              </button>
            ) : (
              <span aria-hidden className="text-center text-[12px]">
                {p.playing ? '❚❚' : '▶'}
              </span>
            )}
            <h2 className="truncate text-center">{title(screen)}</h2>
            <span aria-hidden className="text-center text-[12px]">
              ▮▮▮
            </span>
          </header>

          {screen.id === 'now' ? (
            <NowPlaying onArtist={(name) => push({ id: 'artist', name })} />
          ) : screen.id === 'about' ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center">
              <img src="/icon-192.png" alt="" width={84} height={84} />
              <p className="text-[24px]">stimbox</p>
              <p className="text-[14px] leading-snug">
                lea’s music, on an old mac. songs from spotify, suggestions from
                last.fm, lyrics from lrclib.
              </p>
              <p className="text-[12px] opacity-70">
                open it on a computer for the whole desktop.
              </p>
            </div>
          ) : (
            <>
              {screen.id === 'search' && (
                <div className="shrink-0 px-2 pt-2">
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === 'Enter' && recentSearches.add(q)
                    }
                    placeholder="songs, artists, playlists"
                    aria-label="search"
                    enterKeyHint="search"
                    className="w-full rounded-pill border border-lcd-ink/40 bg-window px-3 py-1.5 text-[16px] text-ink outline-none focus:border-aqua-edge"
                  />
                  <div
                    role="group"
                    aria-label="show"
                    className="flex gap-1.5 overflow-x-auto py-2 text-[13px]"
                  >
                    {(
                      [
                        'all',
                        'songs',
                        'playlists',
                        'albums',
                        'artists',
                      ] as const
                    ).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={tab === t}
                        onClick={() => setTab(t)}
                        className={`shrink-0 rounded-pill border px-2.5 py-0.5 ${
                          tab === t
                            ? 'lcd-sel border-aqua-edge'
                            : 'border-lcd-ink/40'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <ul ref={listRef} className="min-h-0 flex-1 overflow-y-auto">
                {rows.map((r, i) => (
                  <li key={r.key} data-sel={i === sel || undefined}>
                    <button
                      type="button"
                      onClick={() => {
                        setSel(i)
                        r.go()
                      }}
                      className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-1.5 text-left ${
                        i === sel ? 'lcd-sel' : ''
                      }`}
                    >
                      {r.art && <Art art={r.art} size={40} round={r.round} />}
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[16px]">
                          {r.label}
                        </span>
                        {r.sub && (
                          <span className="block truncate text-[12px] opacity-75">
                            {r.sub}
                          </span>
                        )}
                      </span>
                      <span aria-hidden className="opacity-70">
                        ›
                      </span>
                    </button>
                  </li>
                ))}
                {!rows.length && (
                  <li className="p-4 text-center text-[14px] opacity-70">
                    {screen.id === 'search'
                      ? q
                        ? found.loading
                          ? 'searching…'
                          : 'nothing found'
                        : 'type to search'
                      : (screen.id === 'artist' && artist.loading) ||
                          (screen.id === 'chart' && chart.loading)
                        ? 'loading…'
                        : 'nothing here yet'}
                  </li>
                )}
              </ul>
            </>
          )}
        </div>

        <div className="grid shrink-0 place-items-center pt-4 pb-1">
          <div
            {...wheel}
            className="ipod-wheel relative size-[min(68vw,30dvh)] touch-none rounded-full border border-hairline/70 text-[15px] font-bold text-mute"
          >
            <button
              type="button"
              onClick={back}
              className="absolute top-[6%] left-1/2 -translate-x-1/2 px-3 py-1"
            >
              menu
            </button>
            <button
              type="button"
              onClick={p.prev}
              aria-label="previous"
              className="absolute top-1/2 left-[5%] -translate-y-1/2 px-2 py-3"
            >
              ◀◀
            </button>
            <button
              type="button"
              onClick={p.next}
              aria-label="next"
              className="absolute top-1/2 right-[5%] -translate-y-1/2 px-2 py-3"
            >
              ▶▶
            </button>
            <button
              type="button"
              onClick={p.toggle}
              aria-label={p.playing ? 'pause' : 'play'}
              className="absolute bottom-[6%] left-1/2 -translate-x-1/2 px-3 py-1"
            >
              ▶ ❚❚
            </button>
            <button
              type="button"
              onClick={center}
              aria-label={screen.id === 'now' ? 'play or pause' : 'select'}
              className="absolute inset-[31%] rounded-full border border-hairline/70 bg-gradient-to-b from-chrome-hi to-ipod-lo active:brightness-95"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

function NowPlaying({ onArtist }: { onArtist: (name: string) => void }) {
  const p = usePlayer()
  const { lines } = useLyrics(p.track)
  const cur = currentLine(lines, p.position)
  const next = p.queue[p.index + 1]
  const art = p.track.art
  const big =
    'aspect-square w-[min(62vw,30dvh)] rounded-art border border-ink/25 shadow-[0_4px_12px_rgb(0_0_0/0.25)]'
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center overflow-y-auto pt-2">
      <p className="w-full truncate px-3 text-center text-[12px] opacity-75">
        {p.index + 1} of {p.queue.length}
        {p.radio && ' · radio'}
        {next && ` · up next: ${getTrack(next).title}`}
      </p>
      {art.startsWith('https://') ? (
        <img src={art} alt="" className={`${big} mt-2 object-cover`} />
      ) : (
        <span aria-hidden className={`${art} ${big} mt-2 block`} />
      )}
      <p className="mt-2 w-full truncate px-3 text-center text-[19px] font-bold">
        {p.track.title}
      </p>
      <p className="w-full truncate px-3 text-center text-[14px]">
        {p.track.artist.split(', ').map((name, i) => (
          <span key={name}>
            {i > 0 && ', '}
            <button
              type="button"
              onClick={() => onArtist(name)}
              className="underline underline-offset-2"
            >
              {name}
            </button>
          </span>
        ))}
        <span className="opacity-75"> · {p.track.album}</span>
      </p>
      <p
        aria-live="polite"
        className="mt-2 w-full truncate bg-lcd-ink px-3 py-1 text-center text-[14px] text-lcd"
      >
        {lines[cur]?.text ?? '♪ ♪ ♪'}
      </p>
      <label className="relative mx-3 mt-3 block h-[9px] w-[calc(100%-1.5rem)] border border-lcd-ink bg-window">
        <span className="sr-only">seek</span>
        <span
          className="block h-full bg-lcd-ink"
          style={{ width: `${(p.position / p.length) * 100}%` }}
        />
        <input
          type="range"
          min={0}
          max={p.length}
          value={p.position}
          onChange={(e) => p.seek(Number(e.target.value))}
          className="absolute -inset-y-3 inset-x-0 h-auto w-full cursor-pointer opacity-0"
        />
      </label>
      <p className="flex w-full justify-between px-3 pt-0.5 text-[12px] tabular-nums">
        <span>{fmt(p.position)}</span>
        <span>-{fmt(p.length - p.position)}</span>
      </p>
      <div className="mt-1 mb-2 flex gap-2 text-[13px]">
        {(
          [
            ['shuffle', p.shuffle, () => p.setShuffle(!p.shuffle)],
            [
              p.repeat === 'one' ? 'repeat 1' : 'repeat',
              p.repeat !== 'off',
              p.cycleRepeat,
            ],
            [
              p.muted ? 'sound off' : 'sound on',
              !p.muted,
              () => p.setMuted(!p.muted),
            ],
            ['♥', p.loved.has(p.track.id), () => p.toggleLove(p.track.id)],
          ] as const
        ).map(([label, on, run]) => (
          <button
            key={label}
            type="button"
            aria-pressed={on}
            aria-label={label === '♥' ? 'love' : undefined}
            onClick={run}
            className={`rounded-pill border px-2.5 py-1 ${
              on ? 'lcd-sel border-aqua-edge' : 'border-lcd-ink/40'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
