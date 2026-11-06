import { useEffect, useState } from 'react'
import {
  getTrack,
  recentCollections,
  recentSongs,
  tracks,
} from '../data/fake.ts'
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

export function SearchWindow({ query }: { query: string }) {
  const q = query.trim().toLowerCase()
  const results = q
    ? tracks.filter((t) =>
        `${t.title} ${t.artist} ${t.album}`.toLowerCase().includes(q),
      )
    : []
  return (
    <Window
      id="search"
      title={q ? `search — ${q}` : 'search'}
      width={380}
      height={420}
    >
      {!q && (
        <p className="text-mute">type in the search box at the top right ↗</p>
      )}
      {q && results.length === 0 && (
        <p className="text-mute">nothing for “{query}” (っ˘̩╭╮˘̩)っ</p>
      )}
      <TrackList label="search results">
        {results.slice(0, 10).map((t) => (
          <TrackRow key={t.id} id={t.id} />
        ))}
      </TrackList>
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
  const { show } = useDesktop()
  const [setToast, toast] = useUndo()

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
            { value: 'playlists', label: `playlists (${playlists.length})` },
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
  const { playQueue } = usePlayer()
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
                onClick={() => playQueue(c.trackIds)}
                aria-label={`play ${c.title}`}
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
