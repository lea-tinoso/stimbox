import { useState } from 'react'
import { recentCollections, recentSongs, tracks } from '../data/fake.ts'
import { usePlayer } from '../state/player.tsx'
import { Art } from './Art.tsx'
import { Segmented } from './Pill.tsx'
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

export function LibraryWindow() {
  const { liked, loved, disliked, toggleDislike } = usePlayer()
  const [tab, setTab] = useState<'liked' | 'loved' | 'disliked'>('loved')
  const ids = [
    ...(tab === 'liked' ? liked : tab === 'loved' ? loved : disliked),
  ]
  return (
    <Window id="library" title="library" width={400} height={440}>
      <div className="mb-2.5">
        <Segmented
          label="library section"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'loved', label: `loved (${loved.size})` },
            { value: 'liked', label: `liked (${liked.size})` },
            { value: 'disliked', label: `disliked (${disliked.size})` },
          ]}
        />
      </div>
      {ids.length === 0 && (
        <p className="text-mute">
          {tab === 'disliked'
            ? 'nothing here. disliked songs get skipped.'
            : `no ${tab} songs yet. hit ${tab === 'loved' ? '♥' : '👍'} on the ipod.`}
        </p>
      )}
      <TrackList label={`${tab} songs`}>
        {ids.map((id) => (
          <TrackRow
            key={id}
            id={id}
            trailing={
              tab === 'disliked' ? (
                <button
                  type="button"
                  className="text-[11px] text-aqua-deep underline"
                  onClick={() => toggleDislike(id)}
                >
                  undo
                </button>
              ) : undefined
            }
          />
        ))}
      </TrackList>
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
