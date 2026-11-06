import { fmt, getTrack } from '../data/fake.ts'
import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { Art } from './Art.tsx'
import { Pill } from './Pill.tsx'
import { TrackList, TrackRow } from './TrackRow.tsx'
import { Window } from './Window.tsx'

// A playlist or album opened from a card, like YouTube Music's playlist page:
// cover and details on the left, its songs on the right.
export function CollectionWindow() {
  const { collection: c } = useDesktop()
  const { playQueue, setShuffle } = usePlayer()
  if (!c) return null
  const total = c.trackIds.reduce((s, id) => s + getTrack(id).duration, 0)
  const play = (start = 0) => {
    setShuffle(false)
    playQueue(c.trackIds, start)
  }
  return (
    <Window
      id="collection"
      title={c.title}
      width={760}
      height={520}
      bodyClassName="flex gap-5 max-[900px]:flex-col"
    >
      <div className="w-[220px] shrink-0 text-center max-[900px]:w-full">
        <Art
          art={c.art}
          size={220}
          className="mx-auto shadow-[0_6px_16px_rgb(0_0_0/0.25)]"
        />
        <h3 className="mt-3 text-[20px] leading-tight font-normal text-ink">
          {c.title}
        </h3>
        <p className="mt-0.5 text-[11px] text-mute">{c.subtitle}</p>
        <p className="text-[11px] text-mute">
          {c.trackIds.length} songs · {fmt(total)}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Pill
            className="aqua-gel"
            onClick={() => play()}
            disabled={c.trackIds.length === 0}
          >
            ▶ play
          </Pill>
          <Pill
            onClick={() => {
              playQueue(
                c.trackIds,
                Math.floor(Math.random() * c.trackIds.length),
              )
              setShuffle(true)
            }}
            disabled={c.trackIds.length === 0}
          >
            ⇄ shuffle
          </Pill>
        </div>
      </div>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto">
        {c.trackIds.length === 0 ? (
          <p className="text-mute">no songs in here yet.</p>
        ) : (
          <TrackList label={`songs in ${c.title}`}>
            {c.trackIds.map((id, i) => (
              <TrackRow
                key={`${id}-${i}`}
                id={id}
                rank={i + 1}
                onPlay={() => play(i)}
                trailing={
                  <span className="text-[11px] text-mute tabular-nums">
                    {fmt(getTrack(id).duration)}
                  </span>
                }
              />
            ))}
          </TrackList>
        )}
      </div>
    </Window>
  )
}
