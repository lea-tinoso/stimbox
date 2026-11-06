import { useEffect, useRef, useState } from 'react'
import { currentLine, fmt, getTrack } from '../data/fake.ts'
import { useLyrics } from '../lib/lyrics.ts'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { AddToPlaylist } from './AddToPlaylist.tsx'
import { Art } from './Art.tsx'
import { Pill, Segmented } from './Pill.tsx'
import { Reactions } from './Reactions.tsx'
import { TrackList, TrackRow } from './TrackRow.tsx'
import { ArtistLinks } from './ArtistLinks.tsx'
import { Window } from './Window.tsx'

export function NowPlayingWindow() {
  const p = usePlayer()
  const { toIpod } = useDesktop()
  const [tab, setTab] = useState<'lyrics' | 'next'>('lyrics')
  const lyrics = useLyrics(p.track)
  const lines = lyrics.lines
  const cur = currentLine(lines, p.position)
  const curRef = useRef<HTMLLIElement>(null)

  useEffect(() => {
    curRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [cur])

  const upNext = p.queue.slice(p.index + 1)

  return (
    <Window
      id="nowplaying"
      title={`now playing — ${p.track.title}`}
      width={1040}
      height={740}
      onClose={toIpod}
      onMinimize={toIpod}
      bodyClassName="!p-6 flex gap-7 max-[900px]:flex-col max-[900px]:!p-3"
    >
      <div className="w-[420px] shrink-0 max-[900px]:w-full">
        <Art
          art={p.track.art}
          size={420}
          className="aspect-square shadow-[0_6px_16px_rgb(0_0_0/0.25)] max-[900px]:!h-auto max-[900px]:!w-full"
        />
        <h3 className="mt-4 text-[28px] leading-tight font-normal text-ink">
          {p.track.title}
        </h3>
        <p className="text-[15px] text-mute">
          <ArtistLinks
            artist={p.track.artist}
            className="hover:text-ink hover:underline"
          />{' '}
          · {p.track.album} · {p.track.year}
        </p>
        <label className="mt-4 block">
          <span className="sr-only">seek</span>
          <input
            type="range"
            min={0}
            max={p.length}
            value={p.position}
            onChange={(e) => p.seek(Number(e.target.value))}
            className="w-full accent-aqua"
          />
        </label>
        <p className="flex justify-between text-[13px] tabular-nums">
          <span>{fmt(p.position)}</span>
          <span>{fmt(p.length)}</span>
        </p>
        {(p.preview || !p.track.uri) && (
          <p className="mt-1 text-[11px] text-mute">
            {p.track.uri
              ? 'playing a 30-second preview from spotify · log into spotify in this browser for full songs'
              : 'demo song · chiptune stand-in'}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Pill
            pressed={p.shuffle}
            onClick={() => p.setShuffle(!p.shuffle)}
            aria-label="shuffle"
            className="!px-3 text-[15px]"
          >
            ⇄
          </Pill>
          <Pill
            onClick={p.prev}
            aria-label="previous"
            className="!px-3 text-[15px]"
          >
            ◀◀
          </Pill>
          <button
            type="button"
            onClick={p.toggle}
            aria-label={p.playing ? 'pause' : 'play'}
            className="aqua-gel rounded-pill border px-5 py-0.5 text-[15px]"
          >
            {p.playing ? '❚❚' : '▶'}
          </button>
          <Pill
            onClick={p.next}
            aria-label="next"
            className="!px-3 text-[15px]"
          >
            ▶▶
          </Pill>
          <Pill
            pressed={p.repeat !== 'off'}
            onClick={p.cycleRepeat}
            aria-label={`repeat ${p.repeat}`}
            className="!px-3 text-[15px]"
          >
            {p.repeat === 'one' ? '↻¹' : '↻'}
          </Pill>
          <Pill
            pressed={!p.muted}
            onClick={() => p.setMuted(!p.muted)}
            aria-label="sound"
            title={
              p.track.uri && p.muted
                ? 'sound off pauses spotify songs'
                : undefined
            }
            className="!px-3 text-[15px]"
          >
            <span aria-hidden>{p.muted ? '🔇' : '🔊'}</span>
          </Pill>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <Reactions variant="aqua" />
          <AddToPlaylist id={p.track.id} pill />
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="mb-4 flex justify-center">
          <Segmented
            label="now playing view"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'lyrics', label: 'lyrics' },
              { value: 'next', label: 'up next' },
            ]}
          />
        </div>
        {tab === 'lyrics' ? (
          <>
            <ol
              className="min-h-0 flex-1 overflow-auto pr-2"
              aria-label="lyrics"
            >
              {lines.map((l, i) => (
                <li
                  key={i}
                  ref={i === cur ? curRef : undefined}
                  className="py-0.5"
                >
                  <button
                    type="button"
                    onClick={() => p.seek(l.at)}
                    className={`text-left text-[20px] leading-relaxed transition-colors ${
                      i === cur
                        ? 'rounded-[3px] bg-selection px-1.5 text-window'
                        : Math.abs(i - cur) === 1
                          ? 'text-body'
                          : 'text-faint hover:text-body'
                    }`}
                  >
                    {l.text}
                  </button>
                </li>
              ))}
            </ol>
            {lines.length === 0 && (
              <p className="text-mute">
                {lyrics.kind === 'loading'
                  ? 'looking for lyrics…'
                  : 'no lyrics for this one. just vibes ♪'}
              </p>
            )}
            <p className="mt-2 text-[11px] text-mute">
              {lyrics.kind === 'placeholder'
                ? 'placeholder lyrics · tap a line to jump there'
                : lyrics.kind === 'plain'
                  ? 'lyrics from lrclib · not synced to the song'
                  : 'lyrics from lrclib · tap a line to jump there'}
            </p>
          </>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            {upNext.length === 0 ? (
              <p className="text-mute">that's the end of the queue.</p>
            ) : (
              <TrackList label="up next">
                {upNext.map((id) => (
                  <TrackRow key={id} id={id} />
                ))}
              </TrackList>
            )}
            <p className="mt-2 text-[11px] text-mute">
              {upNext.length} songs ·{' '}
              {fmt(upNext.reduce((s, id) => s + getTrack(id).duration, 0))}
            </p>
          </div>
        )}
      </div>
    </Window>
  )
}
