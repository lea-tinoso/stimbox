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
import { getTrack, type Track } from '../data/fake.ts'
import { chiptune } from '../lib/chiptune.ts'
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
  setMuted: (v: boolean) => void
  repeat: Repeat
  liked: Set<string>
  loved: Set<string>
  disliked: Set<string>
  playQueue: (ids: string[], start?: number) => void
  playTrack: (id: string) => void
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
  const [queue, setQueue] = useState<string[]>(() =>
    load('queue', DEFAULT_QUEUE),
  )
  const [index, setIndex] = useState(() => load('index', 0))
  const [position, setPosition] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [shuffle, setShuffle] = useState(false)
  const [muted, setMutedState] = useState(() => load('muted', false))
  const [repeat, setRepeat] = useState<Repeat>('off')
  const [liked, toggleLikeRaw] = useStoredSet('liked')
  const [loved, toggleLoveRaw, setLoved] = useStoredSet('loved')
  const [disliked, toggleDislikeRaw] = useStoredSet('disliked')

  const track = getTrack(queue[index] ?? queue[0])
  const dislikedRef = useRef(disliked)
  useEffect(() => {
    dislikedRef.current = disliked
  }, [disliked])

  useEffect(() => {
    save('queue', queue)
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
    if (playing) chiptune.play(track.id)
    else chiptune.pause()
  }, [playing, track.id])

  useEffect(() => {
    chiptune.setMuted(muted)
    save('muted', muted)
  }, [muted])

  // the fake clock
  useEffect(() => {
    if (!playing) return
    const id = window.setInterval(() => {
      setPosition((p) => {
        if (p + 1 < track.duration) return p + 1
        if (repeat === 'one') return 0
        if (repeat === 'off' && index === queue.length - 1) {
          setPlaying(false)
          return 0
        }
        queueMicrotask(() => step(1))
        return 0
      })
    }, 1000)
    return () => window.clearInterval(id)
  }, [playing, track.duration, repeat, index, queue.length, step])

  const playQueue = useCallback((ids: string[], start = 0) => {
    setQueue(ids)
    setIndex(start)
    setPosition(0)
    setPlaying(true)
  }, [])

  const playTrack = useCallback(
    (id: string) => {
      const at = queue.indexOf(id)
      if (at >= 0) {
        setIndex(at)
      } else {
        setQueue((q) => [...q.slice(0, index + 1), id, ...q.slice(index + 1)])
        setIndex(index + 1)
      }
      setPosition(0)
      setPlaying(true)
    },
    [queue, index],
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

  const api = useMemo<PlayerApi>(
    () => ({
      track,
      queue,
      index,
      playing,
      position,
      shuffle,
      muted,
      setMuted: setMutedState,
      repeat,
      liked,
      loved,
      disliked,
      playQueue,
      playTrack,
      toggle: () => setPlaying((p) => !p),
      next: () => step(1),
      prev: () => (position > 3 ? setPosition(0) : step(-1)),
      seek: (s) =>
        setPosition(Math.max(0, Math.min(track.duration - 1, Math.round(s)))),
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
      repeat,
      liked,
      loved,
      disliked,
      playQueue,
      playTrack,
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
