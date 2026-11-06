import { useEffect, useState } from 'react'
import {
  getTrack,
  registerTracks,
  tracks,
  type Art as ArtKind,
  type Collection,
} from '../data/fake.ts'
import { hiddenPlaylists } from '../lib/hiddenPlaylists.ts'
import { ownerFetch, useIsOwner } from '../lib/owner.ts'
import { recentSearches } from '../lib/recentSearches.ts'
import type { OutResult, OutTrack, SearchData } from '../data/spotify-types.ts'
import { toTrack } from '../data/catalog.ts'
import { useCatalog } from '../state/catalog.tsx'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import {
  usePlaylists,
  type Playlist,
  type Privacy,
} from '../state/playlists.tsx'
import { Art } from './Art.tsx'
import { Pill, Segmented } from './Pill.tsx'
import { TrackList, TrackRow } from './TrackRow.tsx'
import { Window } from './Window.tsx'

type Found = {
  q: string
  ids: string[]
  playlists: OutResult[]
  albums: OutResult[]
  artists: OutResult[]
}
const none = { ids: [], playlists: [], albums: [], artists: [] }

// Spotify search once the real catalog is on, demo search otherwise. Waits for a pause in typing.
function useSearch(q: string) {
  const { source, recentCollections, forYouPlaylists } = useCatalog()
  const [found, setFound] = useState<Found>({ q: '', ...none })
  useEffect(() => {
    if (source !== 'spotify' || !q) return
    const ctl = new AbortController()
    const id = window.setTimeout(() => {
      fetch(`/api/spotify/search?q=${encodeURIComponent(q)}`, {
        signal: ctl.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<SearchData>) : null))
        .then((d) => {
          if (!d) return
          const list = d.tracks.map(toTrack)
          registerTracks(list)
          setFound({
            q,
            ids: list.map((t) => t.id),
            playlists: d.playlists ?? [],
            albums: d.albums ?? [],
            artists: d.artists ?? [],
          })
        })
        .catch(() => {})
    }, 300)
    return () => {
      ctl.abort()
      window.clearTimeout(id)
    }
  }, [q, source])
  if (!q) return { ...none, loading: false }
  if (source === 'spotify')
    return found.q === q
      ? { ...found, loading: false }
      : { ...none, loading: true }
  const has = (text: string) => text.toLowerCase().includes(q)
  const collections = [...recentCollections, ...forYouPlaylists].filter(
    (c, i, a) => a.findIndex((x) => x.id === c.id) === i && has(c.title),
  )
  const asResult = (c: Collection): OutResult => ({
    id: c.id,
    kind: c.kind,
    title: c.title,
    subtitle: c.subtitle,
    image: '',
  })
  return {
    ids: tracks
      .filter((t) => has(`${t.title} ${t.artist} ${t.album}`))
      .map((t) => t.id),
    playlists: collections.filter((c) => c.kind === 'playlist').map(asResult),
    albums: collections.filter((c) => c.kind === 'album').map(asResult),
    artists: [],
    loading: false,
    demo: collections,
  }
}

type SearchTab = 'all' | 'songs' | 'playlists' | 'albums' | 'artists'

// One playlist, album or artist in the results. Opening it loads its songs from Spotify.
function ResultRow({
  r,
  demo,
  onOpen,
}: {
  r: OutResult
  demo?: Collection
  onOpen: () => void
}) {
  const { openCollection } = useDesktop()
  const [state, setState] = useState<'idle' | 'loading' | 'blocked'>('idle')
  const open = async () => {
    onOpen()
    if (demo) return openCollection(demo)
    setState('loading')
    try {
      const res = await fetch(
        `/api/spotify/collection?kind=${r.kind}&id=${encodeURIComponent(r.id)}`,
      )
      const d = (await res.json()) as { tracks: OutTrack[]; blocked?: boolean }
      if (d.blocked || !d.tracks.length) return setState('blocked')
      const list = d.tracks.map(toTrack)
      registerTracks(list)
      setState('idle')
      openCollection({
        id: `${r.kind}-${r.id}`,
        kind: r.kind,
        title: r.title.toLowerCase(),
        subtitle: r.subtitle.toLowerCase(),
        art: r.image.startsWith('https://') ? (r.image as ArtKind) : 'art-6',
        trackIds: list.map((t) => t.id),
      })
    } catch {
      setState('blocked')
    }
  }
  return (
    <li>
      <button
        type="button"
        onClick={() => void open()}
        className="flex w-full items-center gap-2.5 px-1.5 py-1 text-left"
      >
        <Art
          size={30}
          art={
            demo?.art ??
            (r.image.startsWith('https://') ? (r.image as ArtKind) : 'art-6')
          }
          round={r.kind === 'artist'}
        />
        <span className="min-w-0">
          <span className="block truncate text-ink">
            {r.title.toLowerCase()}
          </span>
          <span className="block truncate text-[11px] text-mute">
            {state === 'loading'
              ? 'opening…'
              : state === 'blocked'
                ? 'spotify doesn’t let new apps open this one'
                : r.subtitle.toLowerCase()}
          </span>
        </span>
      </button>
    </li>
  )
}

export function SearchWindow({ query }: { query: string }) {
  const q = query.trim().toLowerCase()
  const found = useSearch(q)
  const { ids, playlists, albums, artists, loading } = found
  const demo = 'demo' in found ? found.demo : undefined
  const { playRadio } = usePlayer()
  const [tab, setTab] = useState<SearchTab>('all')
  const save = () => recentSearches.add(q)
  const groups = [
    { key: 'playlists', label: 'playlists', list: playlists },
    { key: 'albums', label: 'albums', list: albums },
    { key: 'artists', label: 'artists', list: artists },
  ] as const
  const total = ids.length + playlists.length + albums.length + artists.length
  const songs = tab === 'all' ? ids.slice(0, 4) : ids.slice(0, 10)
  return (
    <Window
      id="search"
      title={q ? `search — ${q}` : 'search'}
      width={420}
      height={480}
    >
      {!q && (
        <p className="text-mute">type in the search box at the top right ↗</p>
      )}
      {q && (
        <div className="mb-2.5">
          <Segmented
            label="show"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'all' },
              { value: 'songs', label: 'songs' },
              { value: 'playlists', label: 'playlists' },
              { value: 'albums', label: 'albums' },
              { value: 'artists', label: 'artists' },
            ]}
          />
        </div>
      )}
      {q && loading && <p className="text-mute">searching…</p>}
      {q && !loading && total === 0 && (
        <p className="text-mute">nothing for “{query}” (っ˘̩╭╮˘̩)っ</p>
      )}
      {(tab === 'all' || tab === 'songs') && songs.length > 0 && (
        <section className="mb-3">
          {tab === 'all' && (
            <h3 className="mb-1 text-[11px] text-mute">songs</h3>
          )}
          <TrackList label="songs">
            {songs.map((id) => (
              <TrackRow
                key={id}
                id={id}
                onPlay={() => {
                  save()
                  playRadio(id)
                }}
              />
            ))}
          </TrackList>
        </section>
      )}
      {groups.map(
        (g) =>
          (tab === 'all' || tab === g.key) &&
          g.list.length > 0 && (
            <section key={g.key} className="mb-3">
              {tab === 'all' && (
                <h3 className="mb-1 text-[11px] text-mute">{g.label}</h3>
              )}
              <ul
                aria-label={g.label}
                className="flex flex-col [&>li:nth-child(even)]:bg-stripe"
              >
                {(tab === 'all' ? g.list.slice(0, 4) : g.list).map((r) => (
                  <ResultRow
                    key={r.id}
                    r={r}
                    demo={demo?.find((c) => c.id === r.id)}
                    onOpen={save}
                  />
                ))}
              </ul>
            </section>
          ),
      )}
      {q &&
        !loading &&
        total > 0 &&
        tab !== 'all' &&
        (tab === 'songs' ? ids : found[tab]).length === 0 && (
          <p className="text-mute">
            no {tab} for “{query}”
          </p>
        )}
    </Window>
  )
}

// A small × that removes a row from a list.
function RemoveButton({
  label,
  onClick,
}: {
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title="remove"
      className="grid size-5 shrink-0 place-items-center rounded-full border border-faint bg-window text-[12px] leading-none text-mute hover:border-red hover:text-red"
    >
      ×
    </button>
  )
}

// "removed from loved · undo", shown for a few seconds after a remove.
function useUndo() {
  const [toast, setToast] = useState<{ text: string; undo: () => void } | null>(
    null,
  )
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(null), 5000)
    return () => window.clearTimeout(t)
  }, [toast])
  const bar = toast && (
    <div
      role="status"
      className="absolute inset-x-3 bottom-3 flex items-center justify-between rounded-[5px] bg-ink/85 px-3 py-1.5 text-[11px] text-window shadow-window"
    >
      <span>{toast.text}</span>
      <button
        type="button"
        className="font-bold underline"
        onClick={() => {
          toast.undo()
          setToast(null)
        }}
      >
        undo
      </button>
    </div>
  )
  return [setToast, bar] as const
}

function PlaylistRow({
  pl,
  onRemove,
  onRemoveTrack,
}: {
  pl: Playlist
  onRemove: () => void
  onRemoveTrack: (trackId: string) => void
}) {
  const { playQueue } = usePlayer()
  const [open, setOpen] = useState(false)
  const meta = [pl.privacy, `${pl.trackIds.length} songs`]
  if (pl.collaborate) meta.push('collaborative')
  if (pl.description) meta.push(pl.description)
  return (
    <li>
      <div className="flex items-center gap-2.5 px-1.5 py-1.5">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex min-w-0 flex-1 items-center gap-2.5 text-left"
        >
          <Art art={pl.art} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-ink">
              <span aria-hidden className="mr-1 inline-block w-2 text-mute">
                {open ? '▾' : '▸'}
              </span>
              {pl.title}
            </span>
            <span className="block truncate text-[11px] text-mute">
              {meta.join(' · ')}
            </span>
          </span>
        </button>
        <Pill
          onClick={() => playQueue(pl.trackIds)}
          disabled={pl.trackIds.length === 0}
          aria-label={`play ${pl.title}`}
          className="disabled:opacity-40"
        >
          ▶
        </Pill>
        <RemoveButton
          label={`delete playlist ${pl.title}`}
          onClick={onRemove}
        />
      </div>
      {open && (
        <div className="pb-2 pl-12">
          {pl.trackIds.length === 0 ? (
            <p className="py-1 text-[11px] text-mute">
              empty. add songs with the + on any song.
            </p>
          ) : (
            <TrackList label={`songs in ${pl.title}`}>
              {pl.trackIds.map((id) => (
                <TrackRow
                  key={id}
                  id={id}
                  trailing={
                    <RemoveButton
                      label={`remove ${getTrack(id).title} from ${pl.title}`}
                      onClick={() => onRemoveTrack(id)}
                    />
                  }
                />
              ))}
            </TrackList>
          )}
        </div>
      )}
    </li>
  )
}

export function LibraryWindow() {
  const { liked, loved, disliked, toggleLike, toggleLove, toggleDislike } =
    usePlayer()
  const {
    playlists,
    remove,
    removeTrack,
    libraryTab: tab,
    setLibraryTab,
  } = usePlaylists()
  const { show, openCollection } = useDesktop()
  const { spotifyPlaylists } = useCatalog()
  const owner = useIsOwner()
  const [setToast, toast] = useUndo()
  // Visitors hide a Spotify playlist in their browser. lea's browser deletes it on Spotify too
  // (Spotify calls it unfollowing, so undo follows it again).
  const deleteSpotify = (c: Collection) => {
    const unhide = hiddenPlaylists.hide(c.id)
    if (!owner)
      return setToast({
        text: `deleted ${c.title} from stimbox · still on spotify`,
        undo: unhide,
      })
    const url = `/api/spotify/playlist?id=${c.id.replace(/^pl-/, '')}`
    const done = ownerFetch(url, { method: 'DELETE' })
      .then((r) => r.ok)
      .catch(() => false)
    void done.then(
      (ok) =>
        !ok &&
        setToast({
          text: `spotify didn’t delete ${c.title} · hidden here only`,
          undo: unhide,
        }),
    )
    setToast({
      text: `deleted ${c.title} from spotify`,
      undo: () => {
        unhide()
        void done.then((ok) => {
          if (ok) void ownerFetch(url, { method: 'PUT' }).catch(() => {})
        })
      },
    })
  }

  const lists = {
    loved: { ids: loved, toggle: toggleLove },
    liked: { ids: liked, toggle: toggleLike },
    disliked: { ids: disliked, toggle: toggleDislike },
  }

  return (
    <Window
      id="library"
      title="library"
      width={440}
      height={470}
      bodyClassName="relative"
    >
      <div className="mb-2.5">
        <Segmented
          label="library section"
          value={tab}
          onChange={setLibraryTab}
          options={[
            { value: 'loved', label: `loved (${loved.size})` },
            { value: 'liked', label: `liked (${liked.size})` },
            { value: 'disliked', label: `disliked (${disliked.size})` },
            {
              value: 'playlists',
              label: `playlists (${playlists.length + spotifyPlaylists.length})`,
            },
          ]}
        />
      </div>

      {tab === 'playlists' ? (
        <>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] text-mute">your playlists</span>
            <Pill className="aqua-gel" onClick={() => show('newplaylist')}>
              + new playlist
            </Pill>
          </div>
          {spotifyPlaylists.length > 0 && (
            <>
              <ul
                aria-label="your playlists on spotify"
                className="mb-3 flex flex-col [&>li:nth-child(even)]:bg-stripe"
              >
                {spotifyPlaylists.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 pr-1.5">
                    <button
                      type="button"
                      onClick={() => openCollection(c)}
                      className="flex min-w-0 flex-1 items-center gap-2.5 px-1.5 py-1.5 text-left"
                    >
                      <Art art={c.art} size={36} />
                      <span className="min-w-0">
                        <span className="block truncate text-ink">
                          {c.title}
                        </span>
                        <span className="block truncate text-[11px] text-mute">
                          on spotify · {c.trackIds.length} songs
                        </span>
                      </span>
                    </button>
                    <RemoveButton
                      label={`delete playlist ${c.title}`}
                      onClick={() => deleteSpotify(c)}
                    />
                  </li>
                ))}
              </ul>
              <p className="mb-1.5 text-[11px] text-mute">made here</p>
            </>
          )}
          {playlists.length === 0 && (
            <p className="text-mute">
              no playlists yet. make one, then add songs with the + on any song.
            </p>
          )}
          <ol
            aria-label="your playlists"
            className="flex flex-col pb-10 [&>li:nth-child(even)]:bg-stripe"
          >
            {playlists.map((pl) => (
              <PlaylistRow
                key={pl.id}
                pl={pl}
                onRemove={() =>
                  setToast({
                    text: `deleted ${pl.title}`,
                    undo: remove(pl.id),
                  })
                }
                onRemoveTrack={(id) =>
                  setToast({
                    text: `removed from ${pl.title}`,
                    undo: removeTrack(pl.id, id),
                  })
                }
              />
            ))}
          </ol>
        </>
      ) : (
        <>
          {lists[tab].ids.size === 0 && (
            <p className="text-mute">
              {tab === 'disliked'
                ? 'nothing here. disliked songs get skipped.'
                : `no ${tab} songs yet. hit ${tab === 'loved' ? '♥' : '👍'} on the ipod.`}
            </p>
          )}
          <div className="pb-10">
            <TrackList label={`${tab} songs`}>
              {[...lists[tab].ids].map((id) => (
                <TrackRow
                  key={id}
                  id={id}
                  trailing={
                    <RemoveButton
                      label={`remove ${getTrack(id).title} from ${tab}`}
                      onClick={() => {
                        const { toggle } = lists[tab]
                        toggle(id)
                        setToast({
                          text: `removed from ${tab}`,
                          undo: () => toggle(id),
                        })
                      }}
                    />
                  }
                />
              ))}
            </TrackList>
          </div>
        </>
      )}
      {toast}
    </Window>
  )
}

const PRIVACY: { value: Privacy; label: string }[] = [
  { value: 'public', label: '🌐 public' },
  { value: 'unlisted', label: '🔗 unlisted' },
  { value: 'private', label: '🔒 private' },
]

const fieldClass =
  'w-full rounded-[3px] border border-hairline bg-window px-2 py-1 text-ink shadow-[inset_0_1px_2px_rgb(0_0_0/0.15)] outline-none focus-visible:border-aqua focus-visible:shadow-[0_0_0_3px_rgb(61_140_240/0.35)]'

export function NewPlaylistWindow() {
  const { create, pendingTrack, setPendingTrack, setLibraryTab } =
    usePlaylists()
  const { hide, show } = useDesktop()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [privacy, setPrivacy] = useState<Privacy>('public')
  const [collaborate, setCollaborate] = useState(false)

  const close = () => {
    setTitle('')
    setDescription('')
    setPrivacy('public')
    setCollaborate(false)
    setPendingTrack(null)
    hide('newplaylist')
  }

  return (
    <Window id="newplaylist" title="new playlist" width={380} height={340}>
      <form
        className="flex h-full flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (!title.trim()) return
          create({
            title: title.trim(),
            description: description.trim(),
            privacy,
            collaborate,
          })
          setTitle('')
          setDescription('')
          setPrivacy('public')
          setCollaborate(false)
          hide('newplaylist')
          setLibraryTab('playlists')
          show('library')
        }}
      >
        {pendingTrack && (
          <p className="text-[11px] text-mute">
            “{getTrack(pendingTrack).title}” will be the first song.
          </p>
        )}
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-mute">title</span>
          <input
            name="title"
            required
            autoFocus
            maxLength={100}
            autoComplete="off"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="block">
          <span className="mb-0.5 block text-[11px] text-mute">
            description
          </span>
          <textarea
            name="description"
            rows={2}
            maxLength={300}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${fieldClass} resize-none`}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-[11px] text-mute">privacy</span>
          <select
            name="privacy"
            value={privacy}
            onChange={(e) => setPrivacy(e.target.value as Privacy)}
            className="aqua-pill rounded-[5px] border border-hairline px-2 py-0.5 text-[12px] text-ink"
          >
            {PRIVACY.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-center justify-between border-y border-chrome-hi py-2">
          <span id="collab-label">
            collaborate{' '}
            <span className="text-[11px] text-mute">
              · friends can add songs
            </span>
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={collaborate}
            aria-labelledby="collab-label"
            onClick={() => setCollaborate(!collaborate)}
            className={`relative h-5 w-9 rounded-pill border transition-colors ${
              collaborate
                ? 'aqua-gel border-aqua-edge'
                : 'aqua-pill border-hairline'
            }`}
          >
            <span
              aria-hidden
              className={`absolute top-px size-4 rounded-full border border-hairline bg-window shadow transition-[left] ${
                collaborate ? 'left-[17px]' : 'left-px'
              }`}
            />
          </button>
        </div>
        <div className="mt-auto flex justify-end gap-2">
          <Pill onClick={close}>cancel</Pill>
          <Pill
            type="submit"
            disabled={!title.trim()}
            className="aqua-gel disabled:opacity-50"
          >
            create
          </Pill>
        </div>
      </form>
    </Window>
  )
}

// Opened from "more" on listen again: everything played lately, songs and playlists or albums.
export function RecentWindow() {
  const { openCollection } = useDesktop()
  const { recentSongs, recentCollections } = useCatalog()
  const [tab, setTab] = useState<'songs' | 'collections'>('songs')
  return (
    <Window id="recent" title="recently played" width={420} height={480}>
      <div className="mb-2.5">
        <Segmented
          label="show"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'songs', label: 'songs' },
            { value: 'collections', label: 'playlists & albums' },
          ]}
        />
      </div>
      {tab === 'songs' ? (
        <TrackList label="recently played songs">
          {recentSongs.map((r, i) => (
            <TrackRow
              key={`${r.trackId}-${i}`}
              id={r.trackId}
              trailing={
                <span className="text-[11px] whitespace-nowrap text-mute">
                  {r.when}
                </span>
              }
            />
          ))}
        </TrackList>
      ) : (
        <ol
          aria-label="recently played playlists and albums"
          className="flex flex-col [&>li:nth-child(even)]:bg-stripe"
        >
          {recentCollections.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => openCollection(c)}
                aria-label={`open ${c.title}`}
                className="flex w-full items-center gap-2.5 px-1.5 py-1 text-left"
              >
                <Art art={c.art} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ink">{c.title}</span>
                  <span className="block truncate text-[11px] text-mute">
                    {c.subtitle}
                  </span>
                </span>
                <span className="text-[11px] text-mute">
                  {c.trackIds.length} songs
                </span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </Window>
  )
}
