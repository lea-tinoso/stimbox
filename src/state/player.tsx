import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  demoIds,
  getTrack,
  registerTracks,
  trackById,
  type Track,
} from '../data/fake.ts'
import { toTrack } from '../data/catalog.ts'
import type { OutTrack } from '../data/spotify-types.ts'
import { chiptune } from '../lib/chiptune.ts'
import { spotifyEmbed } from '../lib/spotifyEmbed.ts'
import { useCatalog } from './catalog.tsx'
import { load, save } from '../lib/storage.ts'

// Fake playback: a clock that advances while "playing". Swapped for the Spotify Web Playback SDK later.

type Repeat = 'off' | 'all' | 'one'

type PlayerApi = {
  track: Track
  queue: string[]
  index: number
  playing: boolean
  position: number
  shuffle: boolean
  muted: boolean
  // Spotify only gave a 30-second preview (the visitor isn't logged into Spotify).
  preview: boolean
  // Seconds that will actually play: the preview's length, or the whole song.
  length: number
  setMuted: (v: boolean) => void
  repeat: Repeat
  liked: Set<string>
  loved: Set<string>
  disliked: Set<string>
  playQueue: (ids: string[], start?: number) => void
  playTrack: (id: string) => void
  // Play a song, then keep going with similar songs (a song picked from search).
  playRadio: (id: string) => void
  radio: boolean
  toggle: () => void
  next: () => void
  prev: () => void
  seek: (s: number) => void
  setShuffle: (v: boolean) => void
  cycleRepeat: () => void
  toggleLike: (id: string) => void
  toggleLove: (id: string) => void
  toggleDislike: (id: string) => void
}

const PlayerContext = createContext<PlayerApi | null>(null)

const DEFAULT_QUEUE = [
  'best-part',
  'ivy',
  'multo',
  'dilaw',
  'get-you',
  'tadhana',
]

function useStoredSet(key: string) {
  const [set, setSet] = useState(() => new Set(load<string[]>(key, [])))
  const toggle = useCallback(
    (id: string) =>
      setSet((prev) => {
        const nextSet = new Set(prev)
        if (nextSet.has(id)) nextSet.delete(id)
        else nextSet.add(id)
        save(key, [...nextSet])
        return nextSet
      }),
    [key],
  )
  return [set, toggle, setSet] as const
}

export function PlayerProvider({ children }: { children: ReactNode }) {
  // The queue is saved by song id; Spotify songs' details are saved alongside so a reload can
  // still show them (otherwise unknown ids fell back to the first demo song, "best part").
  const [queue, setQueue] = useState<string[]>(() => {
    registerTracks(load<Track[]>('queueTracks', []))
    const known = load<string[]>('queue', DEFAULT_QUEUE).filter((id) =>
      trackById.has(id),
    )
    return known.length ? known : DEFAULT_QUEUE
  })
  const [index, setIndex] = useState(() =>
    Math.min(load('index', 0), queue.length - 1),
  )
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [muted, setMutedState] = useState(() => load('muted', false))
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [liked, toggleLikeRaw] = useStoredSet('liked')
  const [loved, toggleLoveRaw, setLoved] = useStoredSet('loved')
  const [disliked, toggleDislikeRaw] = useStoredSet('disliked')
  // How long Spotify says the current song is: 30 s when it only gave a preview.
  const [heard, setHeard] = useState({ uri: '', length: 0 })
  const { starter } = useCatalog()

  // When lea's Spotify music arrives, swap a demo queue for her recent songs.
  const [seeded, setSeeded] = useState<string[]>([])
  if (starter.length && seeded !== starter) {
    setSeeded(starter)
    if (queue.every((id) => demoIds.has(id))) {
      setQueue(starter)
      setIndex(0)
      setPosition(0)
    }
  }

  const track = getTrack(queue[index] ?? queue[0])
  const dislikedRef = useRef(disliked)
  useEffect(() => {
    dislikedRef.current = disliked
  }, [disliked])

  useEffect(() => {
    save('queue', queue)
    save(
      'queueTracks',
      queue.filter((id) => !demoIds.has(id)).map((id) => trackById.get(id)),
    )
    save('index', index)
  }, [queue, index])

  const step = useCallback(
    (dir: 1 | -1) => {
      setPosition(0)
      setIndex((i) => {
        // skip disliked songs, like the real app will
        for (let n = 1; n <= queue.length; n++) {
          const j =
            shuffle && dir === 1
              ? Math.floor(Math.random() * queue.length)
              : (i + dir * n + queue.length) % queue.length
          if (!dislikedRef.current.has(queue[j])) return j
        }
        return i
      })
    },
    [queue, shuffle],
  )

  // mockup audio follows play/pause and the current song
  useEffect(() => {
    const opts = { capture: true }
    window.addEventListener('pointerdown', chiptune.unlock, opts)
    window.addEventListener('keydown', chiptune.unlock, opts)
    return () => {
      window.removeEventListener('pointerdown', chiptune.unlock, opts)
      window.removeEventListener('keydown', chiptune.unlock, opts)
    }
  }, [])

  // Real songs play through Spotify's embed, demo songs as chiptune.
  useEffect(() => {
    if (track.uri) {
      chiptune.pause()
      if (playing) void spotifyEmbed.play(track.uri)
      else {
        void spotifyEmbed.pause()
        void spotifyEmbed.cue(track.uri)
      }
    } else {
      void spotifyEmbed.pause()
      if (playing) chiptune.play(track.id)
      else chiptune.pause()
    }
  }, [playing, track.id, track.uri])

  // Spotify's player has no volume control: sound off pauses a Spotify song, and playing one
  // turns the sound back on (before, a muted Spotify song looked like it played but was silent).
  const setMuted = useCallback(
    (v: boolean) => {
      setMutedState(v)
      if (v && track.uri) setPlaying(false)
    },
    [track.uri],
  )

  useEffect(() => {
    chiptune.setMuted(muted)
    save('muted', muted)
  }, [muted])

  // What happens when a song ends, for both the demo clock and Spotify.
  const ended = useCallback(() => {
    setPosition(0)
    if (repeat === 'one') {
      if (track.uri) void spotifyEmbed.seek(0)
      return
    }
    if (repeat === 'off' && index === queue.length - 1) setPlaying(false)
    else step(1)
  }, [repeat, index, queue.length, step, track.uri])

  // the demo clock
  useEffect(() => {
    if (!playing || track.uri) return
    const id = window.setInterval(() => {
      setPosition((p) => {
        if (p + 1 < track.duration) return p + 1
        queueMicrotask(ended)
        return p
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [playing, track.uri, track.duration, ended])

  // Spotify's clock
  const endedRef = useRef(ended)
  useEffect(() => {
    endedRef.current = ended
  }, [ended])
  useEffect(() => {
    const uri = track.uri
    if (!uri) return
    let done = false
    let last = 0
    return spotifyEmbed.onUpdate((u) => {
      if (u.duration <= 0) return
      setHeard({ uri, length: u.duration / 1000 })
      setPosition(Math.floor(u.position / 1000))
      // In a background tab the browser slows the player's updates down, so the one at the
      // very end can be missed. Also count it as ended when Spotify stops by itself (we didn't
      // pause it) or jumps back to the start, shortly after we last saw it near the end.
      const nearEnd = last >= u.duration - 15000
      const stoppedByItself =
        u.isPaused && !u.isBuffering && spotifyEmbed.wantsToPlay()
      const ended =
        u.position >= u.duration - 400 ||
        (nearEnd &&
          (stoppedByItself ||
            (u.position < last - 5000 && !spotifyEmbed.justSeeked())))
      if (!done && ended) {
        done = true
        spotifyEmbed.log('song ended, next', {
          at: last,
          hidden: document.hidden,
        })
        endedRef.current()
      } else if (!ended) done = false
      last = u.position
    })
  }, [track.uri])

  // Radio: after a song from search, keep adding similar songs before the queue runs out.
  // Radio never runs out, like YouTube Music: after a few pages of songs similar to one song, it
  // picks a song it just added as the next seed and keeps going. misses = empty answers in a row.
  const [radio, setRadio] = useState<{
    seed: string
    page: number
    misses?: number
  } | null>(null)
  const radioBusy = useRef(false)
  useEffect(() => {
    // Keep about 10 songs ahead.
    if (
      !radio ||
      radioBusy.current ||
      repeat === 'all' ||
      index < queue.length - 10
    )
      return
    const seed = getTrack(radio.seed)
    if (!seed.uri) return
    radioBusy.current = true
    const ctl = new AbortController()
    const qs = new URLSearchParams({
      track: seed.title,
      artist: seed.artist,
      page: String(radio.page),
    })
    fetch(`/api/spotify/radio?${qs}`, { signal: ctl.signal })
      .then((r) =>
        r.ok ? (r.json() as Promise<{ tracks: OutTrack[] }>) : null,
      )
      .then((d) => {
        // Spotify or Last.fm failed (e.g. search quota): try again at the next song.
        if (!d) return
        const list = d.tracks.map(toTrack)
        registerTracks(list)
        const fresh = list.map((t) => t.id).filter((id) => !queue.includes(id))
        if (fresh.length)
          setQueue((q) => [...q, ...fresh.filter((id) => !q.includes(id))])
        const misses = fresh.length ? 0 : (radio.misses ?? 0) + 1
        if (misses >= 6) return setRadio(null)
        if (radio.page < 4)
          return setRadio({ ...radio, page: radio.page + 1, misses })
        // This seed is used up: carry on from a song from this batch, or from the queue.
        const pool = fresh.length
          ? fresh
          : queue.filter((id) => id !== radio.seed)
        const next = pool[Math.floor(Math.random() * pool.length)]
        setRadio(next ? { seed: next, page: 0, misses } : null)
      })
      .catch(() => {})
      .finally(() => {
        radioBusy.current = false
      })
    return () => {
      ctl.abort()
      radioBusy.current = false
    }
  }, [radio, index, queue, repeat])

  const playRadio = useCallback((id: string) => {
    setQueue([id])
    setIndex(0)
    setPosition(0)
    setPlaying(true)
    if (getTrack(id).uri) setMutedState(false)
    setRadio({ seed: id, page: 0 })
  }, [])

  const playQueue = useCallback((ids: string[], start = 0) => {
    // When a playlist or album ends, keep going with songs like its last one.
    setRadio(ids.length ? { seed: ids[ids.length - 1], page: 0 } : null)
    setQueue(ids)
    setIndex(start)
    setPosition(0)
    setPlaying(true)
    if (getTrack(ids[start] ?? '').uri) setMutedState(false)
  }, [])

  const playTrack = useCallback(
    (id: string) => {
      const at = queue.indexOf(id)
      // A Spotify song from outside the queue (trending, for you, a song page) starts a fresh
      // queue of similar songs, like YouTube Music's radio, instead of slipping into the old one.
      if (at < 0 && getTrack(id).uri) return playRadio(id)
      if (at >= 0) {
        setIndex(at)
      } else {
        setQueue((q) => [...q.slice(0, index + 1), id, ...q.slice(index + 1)])
        setIndex(index + 1)
      }
      setPosition(0)
      setPlaying(true)
      if (getTrack(id).uri) setMutedState(false)
    },
    [queue, index, playRadio],
  )

  const toggleLove = useCallback(
    (id: string) => {
      // love = saved to the "loved" playlist, and it also counts as a like
      toggleLoveRaw(id)
      if (!loved.has(id) && !liked.has(id)) toggleLikeRaw(id)
    },
    [loved, liked, toggleLoveRaw, toggleLikeRaw],
  )

  const toggleLike = useCallback(
    (id: string) => {
      toggleLikeRaw(id)
      if (liked.has(id) && loved.has(id)) {
        // un-liking also un-loves
        setLoved((prev) => {
          const s = new Set(prev)
          s.delete(id)
          save('loved', [...s])
          return s
        })
      }
    },
    [liked, loved, toggleLikeRaw, setLoved],
  )

  const toggleDislike = useCallback(
    (id: string) => {
      const willDislike = !disliked.has(id)
      toggleDislikeRaw(id)
      if (willDislike && id === track.id) step(1)
    },
    [disliked, toggleDislikeRaw, track.id, step],
  )

  const preview = heard.uri === track.uri && heard.length < track.duration - 5

  const api = useMemo<PlayerApi>(
    () => ({
      track,
      queue,
      index,
      playing,
      position,
      shuffle,
      muted,
      preview,
      length: preview ? heard.length : track.duration,
      setMuted,
      repeat,
      liked,
      loved,
      disliked,
      playQueue,
      playTrack,
      playRadio,
      radio: radio !== null,
      toggle: () => {
        if (!playing && track.uri) setMutedState(false)
        setPlaying((p) => !p)
      },
      next: () => step(1),
      prev: () => (position > 3 ? setPosition(0) : step(-1)),
      seek: (s) => {
        const end = preview ? heard.length : track.duration
        const to = Math.max(0, Math.min(end - 1, Math.round(s)))
        setPosition(to)
        if (track.uri) void spotifyEmbed.seek(to)
      },
      setShuffle,
      cycleRepeat: () =>
        setRepeat((r) => (r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')),
      toggleLike,
      toggleLove,
      toggleDislike,
    }),
    [
      track,
      queue,
      index,
      playing,
      position,
      shuffle,
      muted,
      setMuted,
      heard,
      preview,
      repeat,
      liked,
      loved,
      disliked,
      playQueue,
      playTrack,
      playRadio,
      radio,
      step,
      toggleLike,
      toggleLove,
      toggleDislike,
    ],
  )

  return <PlayerContext value={api}>{children}</PlayerContext>
}

export function usePlayer() {
  const ctx = use(PlayerContext)
  if (!ctx) throw new Error('usePlayer needs PlayerProvider')
  return ctx
}
