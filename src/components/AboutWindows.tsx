import { useEffect, useState } from 'react'
import { chiptune } from '../lib/chiptune.ts'
import { useDesktop, WINDOW_COUNT } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { Pill } from './Pill.tsx'
import { Window } from './Window.tsx'

// "About this stimbox", in the style of About This Mac: the stack listed like Mac specs.
const SPECS: [string, string][] = [
  ['processor', 'React 19.3 · TypeScript 6'],
  ['graphics', 'Tailwind CSS 4.3 · Aqua tokens'],
  ['build tool', 'Vite 8'],
  ['music', 'Spotify Web API · Playback SDK'],
  ['startup disk', 'Vercel'],
  ['built with', 'lea + Claude Code, 3 hyperfixations ago'],
]

export function AboutWindow() {
  const [checked, setChecked] = useState(false)
  return (
    <Window id="about" title="about this stimbox" width={380}>
      <div className="text-center">
        <img
          src="/icon-192.png"
          alt=""
          width={84}
          height={84}
          className="mx-auto drop-shadow-[0_4px_6px_rgb(0_0_0/0.3)]"
        />
        <p className="mt-1 text-[30px] leading-tight font-light tracking-tight text-ink">
          stimbox
        </p>
        <p className="text-[11px] text-mute">version 0.4 (build {__BUILD__})</p>
        <div className="mt-2.5 mb-3.5" aria-live="polite">
          {checked ? (
            <p className="text-[11px] text-body">
              you’re on the latest version. it’s still on repeat.
            </p>
          ) : (
            <Pill onClick={() => setChecked(true)}>check for updates…</Pill>
          )}
        </div>
      </div>
      <dl className="border-t border-chrome-hi pt-2.5 text-[11px] leading-[1.75]">
        {SPECS.map(([k, v]) => (
          <div key={k} className="flex gap-2.5">
            <dt className="w-[96px] shrink-0 text-right font-bold text-ink">
              {k}
            </dt>
            <dd className="text-body">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 mb-2 text-center">
        <a
          href="https://github.com/lea-tinoso/stimbox#readme"
          target="_blank"
          rel="noreferrer"
          className="aqua-pill inline-block rounded-pill border border-hairline px-3 py-0.5 text-[11px] text-ink"
        >
          more info…
        </a>
      </div>
      <p className="text-center text-[9px] text-mute">
        ™ &amp; © 2026 lea. made with too many replays.
      </p>
    </Window>
  )
}

// When this page was opened, for the terminal's "Last login" line.
const LOGIN = new Date().toDateString()

const time = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

const clock = (ms: number) => {
  const s = Math.floor(ms / 1000)
  return [s / 3600, (s % 3600) / 60, s % 60]
    .map((n) => String(Math.floor(n)).padStart(2, '0'))
    .join(':')
}

const bar = (fraction: number) => {
  const n = Math.round(Math.min(1, Math.max(0, fraction)) * 10)
  return `[${'█'.repeat(n)}${'░'.repeat(10 - n)}]`
}

function storageBytes() {
  try {
    let n = 0
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i) ?? ''
      if (k.startsWith('stimbox:'))
        n += k.length + (localStorage.getItem(k)?.length ?? 0)
    }
    return n
  } catch {
    return 0
  }
}

// Frames per second, counted with requestAnimationFrame and reported once a second.
function useFps(active: boolean) {
  const [fps, setFps] = useState(0)
  useEffect(() => {
    if (!active) return
    let frames = 0
    let start = performance.now()
    let id = requestAnimationFrame(function loop(now) {
      frames++
      if (now - start >= 1000) {
        setFps(Math.round((frames * 1000) / (now - start)))
        frames = 0
        start = now
      }
      id = requestAnimationFrame(loop)
    })
    return () => cancelAnimationFrame(id)
  }, [active])
  return fps
}

// Re-render once a second so the numbers stay live. Returns ms since the page loaded.
function useTick(active: boolean) {
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!active) return
    const id = window.setInterval(() => setNow(performance.now()), 1000)
    return () => window.clearInterval(id)
  }, [active])
  return now
}

function Row({ k, v, extra }: { k: string; v: string; extra?: string }) {
  return (
    <div className="flex">
      <span className="w-[19ch] shrink-0 pl-[2ch] text-term-dim">{k}</span>
      <span className="w-[24ch] shrink-0 truncate">{v}</span>
      {extra && <span aria-hidden>{extra}</span>}
    </div>
  )
}

// Stats for nerds, opened from the terminal icon on the desktop or "nerdstats" on the sticky.
export function TerminalWindow() {
  const { open } = useDesktop()
  const { track, position, playing, repeat, shuffle } = usePlayer()
  const active = open.has('terminal')
  const fps = useFps(active)
  const uptime = useTick(active)
  const audio = chiptune.stats()
  const kb = (storageBytes() / 1024).toFixed(1)

  return (
    <Window
      id="terminal"
      title="terminal — stimbox — 80×24"
      width={560}
      height={410}
      bodyClassName="bg-term font-mono text-[11px] leading-[1.65] text-term-ink"
    >
      <p className="text-term-dim">
        Last login: {LOGIN} on ttys000
      </p>
      <p>
        <span className="text-term-green">lea@stimbox ~ %</span> stimbox
        --stats-for-nerds
      </p>
      <p className="mt-[1.65em] text-term-blue">
        {playing ? '●' : '○'} live · updates every second
      </p>
      <div aria-live="off">
        <Row k="frames / sec" v={String(fps)} extra={bar(fps / 60)} />
        <Row
          k="now playing"
          v={`${track.title} ${time(position)}/${time(track.duration)}`}
          extra={bar(position / track.duration)}
        />
        <Row
          k="tempo · key"
          v={audio.bpm ? `${audio.bpm} bpm · ${audio.key}` : 'press play'}
        />
        <Row
          k="oscillators"
          v={`${audio.live} live · ${audio.played.toLocaleString()} played`}
        />
        <Row
          k="sample rate"
          v={
            audio.sampleRate
              ? `${audio.sampleRate.toLocaleString()} Hz`
              : audio.state
          }
        />
        <Row k="windows open" v={`${open.size} of ${WINDOW_COUNT}`} />
        <Row k="repeat · shuffle" v={`${repeat} · ${shuffle ? 'on' : 'off'}`} />
        <Row k="local storage" v={`${kb} KB`} extra={bar(+kb / 5120)} />
        <Row
          k="screen"
          v={`${window.innerWidth}×${window.innerHeight} @${window.devicePixelRatio}x`}
        />
        <Row k="uptime" v={clock(uptime)} />
      </div>
      <p className="mt-[1.65em] text-term-dim">nothing leaves your browser.</p>
      <p>
        <span className="text-term-green">lea@stimbox ~ %</span>{' '}
        <span className="type-caret bg-term-ink" aria-hidden>
          &nbsp;
        </span>
      </p>
    </Window>
  )
}
