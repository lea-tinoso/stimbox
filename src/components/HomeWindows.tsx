import { useState } from 'react'
import { getTrack, type Range } from '../data/fake.ts'
import { useCatalog } from '../state/catalog.tsx'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { Art } from './Art.tsx'
import { Pill, Segmented } from './Pill.tsx'
import { TrackList, TrackRow } from './TrackRow.tsx'
import { Window } from './Window.tsx'

export function ListenAgainWindow() {
  const { playQueue } = usePlayer()
  const { show } = useDesktop()
  const { listenAgain } = useCatalog()
  return (
    <Window id="listen" title="listen again" width={820} height={252}>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="text-[11px] text-mute">
          playlists &amp; albums you played this week
        </p>
        <Pill onClick={() => show('recent')}>more ›</Pill>
      </div>
      <ul className="flex gap-3 overflow-x-auto pb-1">
        {listenAgain.map((c) => (
          <li key={c.id} className="w-[118px] shrink-0">
            <button
              type="button"
              onClick={() => playQueue(c.trackIds)}
              className="group w-full text-left"
              aria-label={`play ${c.title}`}
            >
              <span className="relative block">
                <Art
                  art={c.art}
                  size={118}
                  className="shadow-[0_3px_8px_rgb(0_0_0/0.25)] transition group-hover:brightness-90"
                />
                <span
                  aria-hidden
                  className="absolute inset-0 hidden place-items-center text-[30px] text-window drop-shadow group-hover:grid"
                >
                  ▶
                </span>
              </span>
              <span className="mt-1.5 block truncate text-ink">{c.title}</span>
              <span className="block truncate text-[11px] text-mute">
                {c.subtitle}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Window>
  )
}

export function ForYouWindow() {
  const [tab, setTab] = useState<'songs' | 'playlists'>('songs')
  const { playQueue } = usePlayer()
  const { forYouSongs, forYouPlaylists, forYouNote } = useCatalog()
  return (
    <Window id="foryou" title="for you" width={404} height={392}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <Segmented
          label="show"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'songs', label: 'songs' },
            { value: 'playlists', label: 'playlists' },
          ]}
        />
        <span className="truncate text-[11px] text-mute">{forYouNote}</span>
      </div>
      {tab === 'songs' ? (
        <TrackList label="suggested songs">
          {forYouSongs.map((id) => (
            <TrackRow key={id} id={id} />
          ))}
        </TrackList>
      ) : (
        <ul className="flex flex-col [&>li:nth-child(even)]:bg-stripe">
          {forYouPlaylists.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => playQueue(p.trackIds)}
                className="flex w-full items-center gap-2.5 px-1.5 py-1.5 text-left"
              >
                <Art art={p.art} size={44} />
                <span className="min-w-0">
                  <span className="block truncate text-ink">{p.title}</span>
                  <span className="block truncate text-[11px] text-mute">
                    {p.subtitle} · {p.trackIds.length} songs
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Window>
  )
}

const regions = [
  { value: 'ph', label: 'philippines' },
  { value: 'asia', label: 'asia' },
  { value: 'world', label: 'world' },
] as const

function Move({ move }: { move: number | 'new' }) {
  const base = 'rounded-pill border px-1.5 text-[10px] tabular-nums'
  if (move === 'new')
    return <span className={`${base} border-green text-green`}>new</span>
  if (move === 0)
    return (
      <span
        className={`${base} border-hairline text-mute`}
        aria-label="no change"
      >
        –
      </span>
    )
  return move > 0 ? (
    <span
      className={`${base} border-green text-green`}
      aria-label={`up ${move}`}
    >
      ▲{move}
    </span>
  ) : (
    <span
      className={`${base} border-red text-red`}
      aria-label={`down ${-move}`}
    >
      ▼{-move}
    </span>
  )
}

export function TrendingWindow() {
  const [region, setRegion] = useState<'ph' | 'asia' | 'world'>('ph')
  const { trending } = useCatalog()
  return (
    <Window id="trending" title="trending" width={404} height={392}>
      <div className="mb-2.5">
        <Segmented
          label="region"
          value={region}
          onChange={setRegion}
          options={[...regions]}
        />
      </div>
      <TrackList label={`trending in ${region}`}>
        {trending[region].map((e, i) => (
          <TrackRow
            key={e.trackId}
            id={e.trackId}
            rank={i + 1}
            trailing={<Move move={e.move} />}
          />
        ))}
      </TrackList>
    </Window>
  )
}

export function StatsWindow() {
  const [range, setRange] = useState<Range>('4w')
  const s = useCatalog().stats[range]
  const max = Math.max(1, ...s.genres.map((g) => g.share))
  const peakAt = s.byHour.indexOf(Math.max(...s.byHour))
  return (
    <Window id="stats" title="your algorithm" width={300} height={742}>
      <Segmented
        label="time range"
        value={range}
        onChange={setRange}
        options={[
          { value: '4w', label: '4 wks' },
          { value: '6m', label: '6 mo' },
          { value: '1y', label: '1 yr' },
        ]}
      />
      <h3 className="mt-3 mb-2 text-[11px] font-bold tracking-wider text-mute uppercase">
        what you're into
      </h3>
      {s.genres.length === 0 && (
        <p className="text-[11px] text-mute">
          spotify doesn’t share genres with new apps yet
        </p>
      )}
      <ul className="flex flex-col gap-1.5">
        {s.genres.map((g, i) => (
          <li key={g.name} className="flex items-center gap-2">
            <span className="w-24 text-ink">{g.name}</span>
            <span
              className={`h-[11px] rounded-pill border ${i === 0 ? 'aqua-bar-pink border-pink' : 'aqua-bar border-aqua-edge'}`}
              style={{ width: `${(g.share / max) * 120}px` }}
            />
            <span className="tabular-nums">{g.share}%</span>
          </li>
        ))}
      </ul>
      <h3 className="mt-4 mb-1 text-[11px] font-bold tracking-wider text-mute uppercase">
        listening time
      </h3>
      <p className="flex items-baseline gap-2">
        <span className="text-[36px] leading-none font-bold tracking-tight text-ink">
          {s.hours}h
        </span>
        <span className="text-[11px] text-mute">
          {s.hoursNote ??
            (range === '4w'
              ? 'this month'
              : range === '6m'
                ? 'last 6 months'
                : 'this year')}
          {s.hoursDelta !== undefined && ` · ▲ ${s.hoursDelta}h`}
        </span>
      </p>
      <div
        className="mt-2 flex h-14 items-end gap-[3px] border-b border-ink"
        aria-label={`most listening ${s.peak}`}
        role="img"
      >
        {s.byHour.map((h, i) => (
          <span
            key={i}
            className={`flex-1 rounded-t-[2px] ${i === peakAt ? 'bg-pink' : 'bg-aqua'}`}
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <p className="mt-1 flex justify-between text-[11px] text-mute">
        <span>12am</span>
        <span>peak: {s.peak}</span>
        <span>10pm</span>
      </p>
      <h3 className="mt-4 mb-1 text-[11px] font-bold tracking-wider text-mute uppercase">
        top artists
      </h3>
      <ol className="flex flex-col [&>li:nth-child(even)]:bg-stripe">
        {s.topArtists.map((a, i) => (
          <li key={a.name} className="flex items-center gap-2.5 px-1.5 py-1">
            <span className="w-3 text-[11px] text-mute">{i + 1}</span>
            <Art art={a.art} size={30} round />
            <span className="text-ink">{a.name}</span>
          </li>
        ))}
      </ol>
      <h3 className="mt-4 mb-1 text-[11px] font-bold tracking-wider text-mute uppercase">
        on repeat
      </h3>
      <ol className="flex flex-col [&>li:nth-child(even)]:bg-stripe">
        {s.onRepeat.map((r, i) => {
          const t = getTrack(r.trackId)
          return (
            <li
              key={r.trackId}
              className="flex items-center gap-2.5 px-1.5 py-1"
            >
              <span className="w-3 text-[11px] text-mute">{i + 1}</span>
              <Art art={t.art} size={30} />
              <span className="min-w-0">
                <span className="block truncate text-ink">{t.title}</span>
                <span className="block text-[11px] text-mute">
                  {r.plays === undefined ? t.artist : `${r.plays} plays`}
                </span>
              </span>
            </li>
          )
        })}
      </ol>
      <p className="mt-3 border border-hairline bg-desk p-1.5 text-[11px] text-mute">
        {s.repeatShare}% repeats · {100 - s.repeatShare}% new to you
      </p>
    </Window>
  )
}
