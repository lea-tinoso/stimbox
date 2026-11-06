// Fake data for the MVP. Real songs, artists and albums for realism; the lyrics are original placeholder
// text written for this app (real lyrics will come from LRCLIB later). Album art is a CSS pattern.

export type Pattern = `art-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10}`
// A CSS pattern for demo data, or a Spotify cover image URL.
export type Art = Pattern | `https://${string}`

export type Track = {
  id: string
  title: string
  artist: string
  album: string
  year: number
  art: Art
  duration: number // seconds
  // Spotify track URI. Demo songs have none and play as chiptune.
  uri?: string
}

export type LyricLine = { at: number; text: string }

export type Collection = {
  id: string
  title: string
  kind: 'playlist' | 'album' | 'artist'
  subtitle: string
  art: Art
  trackIds: string[]
}

export type ChartEntry = { trackId: string; move: number | 'new' }

export type Range = '4w' | '6m' | '1y'

export type Stats = {
  genres: { name: string; share: number }[]
  hours: number
  hoursDelta?: number
  // Says where the listening numbers come from when they aren't for the whole range.
  hoursNote?: string
  byHour: number[] // 12 two-hour buckets, 0-100
  peak: string
  topArtists: { name: string; art: Art }[]
  onRepeat: { trackId: string; plays?: number }[]
  repeatShare: number
}

const t = (
  id: string,
  title: string,
  artist: string,
  album: string,
  year: number,
  art: Art,
  duration: number,
): Track => ({
  id,
  title,
  artist,
  album,
  year,
  art,
  duration,
})

export const tracks: Track[] = [
  t(
    'best-part',
    'best part',
    'daniel caesar, h.e.r.',
    'freudian',
    2017,
    'art-4',
    210,
  ),
  t('ivy', 'ivy', 'frank ocean', 'blonde', 2016, 'art-9', 250),
  t('multo', 'multo', 'cup of joe', 'silakbo', 2024, 'art-8', 238),
  t('pasilyo', 'pasilyo', 'sunkissed lola', 'pasilyo', 2022, 'art-5', 229),
  t('ere', 'ere', 'juan karlos', 'sad songs and bullshit', 2023, 'art-9', 262),
  t('dilaw', 'dilaw', 'maki', 'dilaw', 2023, 'art-1', 214),
  t(
    'get-you',
    'get you',
    'daniel caesar, kali uchis',
    'freudian',
    2017,
    'art-7',
    278,
  ),
  t('pink-white', 'pink + white', 'frank ocean', 'blonde', 2016, 'art-3', 184),
  t('tadhana', 'tadhana', 'up dharma down', 'capacities', 2012, 'art-2', 290),
  t('sana', 'sana', 'up dharma down', 'capacities', 2012, 'art-6', 251),
  t(
    'superpowers',
    'superpowers',
    'daniel caesar',
    'case study 01',
    2019,
    'art-10',
    233,
  ),
  t('blink-twice', 'blink twice', 'bini', 'talaarawan', 2024, 'art-6', 196),
  t('palagi', 'palagi', 'tj monterde', 'sariling mundo', 2024, 'art-10', 248),
  t('sining', 'sining', 'dionela, jay r', 'sining', 2024, 'art-8', 221),
  t('museo', 'museo', 'eliza maturan', 'museo', 2023, 'art-5', 236),
  t('karera', 'karera', 'bini', 'talaarawan', 2024, 'art-9', 203),
  t('pantropiko', 'pantropiko', 'bini', 'talaarawan', 2023, 'art-3', 189),
  t(
    'raining-in-manila',
    'raining in manila',
    'lola amour',
    'raining in manila',
    2023,
    'art-7',
    244,
  ),
  t(
    'marikit',
    'marikit',
    'juan caoile, kyleswish',
    'marikit',
    2021,
    'art-1',
    201,
  ),
  t('sawa-na', 'sawa na', 'adie', 'sawa na', 2021, 'art-6', 236),
]

export const trackById = new Map(tracks.map((x) => [x.id, x]))
export const getTrack = (id: string) => trackById.get(id) ?? tracks[0]
export const demoIds = new Set(tracks.map((x) => x.id))

// Real songs from Spotify join the same lookup, so every component can keep using getTrack.
export function registerTracks(list: Track[]) {
  for (const x of list) trackById.set(x.id, x)
}

const verses = [
  [
    'the kettle hums the same old note',
    'i hum it back, i know it by heart',
    'the window fogs, i draw a little boat',
    'and sail it off before the morning starts',
  ],
  [
    'play it again, play it again',
    'the part where the drums come in',
    'my head is a room with the lights all on',
    'and this song is the only door',
  ],
  [
    'forty-seven times and counting',
    'it still lands right where it should',
    'the world is loud, the world is shouting',
    'this chorus says i understood',
  ],
  [
    'jeepney window, city humming',
    'headphones on, the rain is coming',
    'every stop another verse',
    'every verse a little less rehearsed',
  ],
]

export function lyricsFor(track: Track): LyricLine[] {
  const seed = track.id.length % verses.length
  const lines = [
    ...verses[seed],
    ...verses[(seed + 1) % verses.length],
    ...verses[seed],
    ...verses[(seed + 2) % verses.length],
  ]
  const step = Math.max(6, Math.floor((track.duration - 12) / lines.length))
  return lines.map((text, i) => ({ at: 8 + i * step, text }))
}

export const listenAgain: Collection[] = [
  {
    id: 'opm-faves',
    title: 'opm faves',
    kind: 'playlist',
    subtitle: 'playlist · 2h ago',
    art: 'art-1',
    trackIds: ['multo', 'dilaw', 'pasilyo', 'ere', 'museo', 'sining'],
  },
  {
    id: 'sunday',
    title: "it's sunday, slow down",
    kind: 'playlist',
    subtitle: 'playlist · today',
    art: 'art-3',
    trackIds: ['best-part', 'ivy', 'tadhana', 'sana', 'pink-white'],
  },
  {
    id: 'blonde',
    title: 'blonde',
    kind: 'album',
    subtitle: 'album · frank ocean',
    art: 'art-2',
    trackIds: ['ivy', 'pink-white'],
  },
  {
    id: 'disney',
    title: 'disney playlist',
    kind: 'playlist',
    subtitle: 'playlist · yesterday',
    art: 'art-6',
    trackIds: ['blink-twice', 'karera', 'pantropiko'],
  },
  {
    id: 'freudian',
    title: 'freudian',
    kind: 'album',
    subtitle: 'album · daniel caesar',
    art: 'art-4',
    trackIds: ['best-part', 'get-you'],
  },
  {
    id: 'unnamed-opm',
    title: 'unnamed opm',
    kind: 'playlist',
    subtitle: 'playlist · tue',
    art: 'art-5',
    trackIds: ['palagi', 'marikit', 'raining-in-manila', 'sawa-na'],
  },
]

// Everything played lately, newest first. "listen again" shows the top of the collections list.
export const recentSongs: { trackId: string; when: string }[] = [
  { trackId: 'best-part', when: 'now' },
  { trackId: 'multo', when: '2h ago' },
  { trackId: 'dilaw', when: '2h ago' },
  { trackId: 'pasilyo', when: '3h ago' },
  { trackId: 'pink-white', when: 'today' },
  { trackId: 'tadhana', when: 'today' },
  { trackId: 'ivy', when: 'today' },
  { trackId: 'blink-twice', when: 'yesterday' },
  { trackId: 'karera', when: 'yesterday' },
  { trackId: 'get-you', when: 'wed' },
  { trackId: 'palagi', when: 'tue' },
  { trackId: 'sawa-na', when: 'tue' },
  { trackId: 'museo', when: 'mon' },
  { trackId: 'sana', when: 'last week' },
]

export const recentCollections: Collection[] = [
  ...listenAgain,
  {
    id: 'rainy-day',
    title: 'rainy day in manila',
    kind: 'playlist',
    subtitle: 'playlist · mon',
    art: 'art-7',
    trackIds: ['raining-in-manila', 'tadhana', 'sana', 'ere'],
  },
  {
    id: 'hiling',
    title: 'pantropiko era',
    kind: 'playlist',
    subtitle: 'playlist · last week',
    art: 'art-8',
    trackIds: ['pantropiko', 'karera', 'blink-twice'],
  },
  {
    id: 'channel-orange',
    title: 'channel orange',
    kind: 'album',
    subtitle: 'album · frank ocean · last week',
    art: 'art-9',
    trackIds: ['pink-white', 'ivy'],
  },
]

export const forYouSongs = [
  'multo',
  'pasilyo',
  'ere',
  'dilaw',
  'get-you',
  'pink-white',
  'tadhana',
  'sana',
  'superpowers',
]

export const forYouPlaylists: Collection[] = [
  {
    id: 'fy-1',
    title: 'rainy jeepney rides',
    kind: 'playlist',
    subtitle: 'like opm faves',
    art: 'art-5',
    trackIds: ['raining-in-manila', 'museo', 'ere', 'tadhana'],
  },
  {
    id: 'fy-2',
    title: 'slow r&b, low lights',
    kind: 'playlist',
    subtitle: 'like sunday, slow down',
    art: 'art-4',
    trackIds: ['best-part', 'get-you', 'superpowers', 'ivy'],
  },
  {
    id: 'fy-3',
    title: 'p-pop on repeat',
    kind: 'playlist',
    subtitle: 'like disney playlist',
    art: 'art-6',
    trackIds: ['blink-twice', 'karera', 'pantropiko'],
  },
]

export const trending: Record<'ph' | 'asia' | 'world', ChartEntry[]> = {
  ph: [
    { trackId: 'multo', move: 2 },
    { trackId: 'blink-twice', move: -1 },
    { trackId: 'dilaw', move: 0 },
    { trackId: 'palagi', move: 5 },
    { trackId: 'sining', move: 'new' },
    { trackId: 'museo', move: -2 },
    { trackId: 'karera', move: 0 },
    { trackId: 'pantropiko', move: -3 },
    { trackId: 'raining-in-manila', move: 0 },
  ],
  asia: [
    { trackId: 'blink-twice', move: 1 },
    { trackId: 'multo', move: 3 },
    { trackId: 'best-part', move: -1 },
    { trackId: 'pantropiko', move: 0 },
    { trackId: 'dilaw', move: 'new' },
    { trackId: 'get-you', move: -2 },
    { trackId: 'karera', move: 1 },
    { trackId: 'ivy', move: 0 },
    { trackId: 'superpowers', move: -1 },
  ],
  world: [
    { trackId: 'best-part', move: 0 },
    { trackId: 'ivy', move: 2 },
    { trackId: 'get-you', move: -1 },
    { trackId: 'pink-white', move: 1 },
    { trackId: 'superpowers', move: 'new' },
    { trackId: 'multo', move: 4 },
    { trackId: 'blink-twice', move: -2 },
    { trackId: 'tadhana', move: 0 },
    { trackId: 'sana', move: 0 },
  ],
}

export const stats: Record<Range, Stats> = {
  '4w': {
    genres: [
      { name: 'opm', share: 38 },
      { name: 'r&b', share: 26 },
      { name: 'indie pop', share: 16 },
      { name: 'p-pop', share: 11 },
      { name: 'soundtrack', share: 9 },
    ],
    hours: 31,
    hoursDelta: 4,
    byHour: [10, 6, 4, 12, 30, 42, 26, 38, 55, 96, 80, 44],
    peak: '9–11 pm',
    topArtists: [
      { name: 'daniel caesar', art: 'art-4' },
      { name: 'cup of joe', art: 'art-1' },
      { name: 'frank ocean', art: 'art-2' },
    ],
    onRepeat: [
      { trackId: 'best-part', plays: 47 },
      { trackId: 'multo', plays: 31 },
    ],
    repeatShare: 62,
  },
  '6m': {
    genres: [
      { name: 'opm', share: 34 },
      { name: 'r&b', share: 30 },
      { name: 'p-pop', share: 15 },
      { name: 'indie pop', share: 13 },
      { name: 'soundtrack', share: 8 },
    ],
    hours: 182,
    hoursDelta: 21,
    byHour: [14, 8, 5, 10, 28, 40, 30, 41, 60, 90, 84, 50],
    peak: '9–11 pm',
    topArtists: [
      { name: 'frank ocean', art: 'art-2' },
      { name: 'daniel caesar', art: 'art-4' },
      { name: 'bini', art: 'art-6' },
    ],
    onRepeat: [
      { trackId: 'ivy', plays: 112 },
      { trackId: 'best-part', plays: 98 },
    ],
    repeatShare: 58,
  },
  '1y': {
    genres: [
      { name: 'r&b', share: 33 },
      { name: 'opm', share: 31 },
      { name: 'indie pop', share: 17 },
      { name: 'p-pop', share: 12 },
      { name: 'soundtrack', share: 7 },
    ],
    hours: 341,
    hoursDelta: 40,
    byHour: [16, 9, 6, 12, 26, 38, 33, 45, 58, 88, 86, 52],
    peak: '8–10 pm',
    topArtists: [
      { name: 'frank ocean', art: 'art-2' },
      { name: 'up dharma down', art: 'art-6' },
      { name: 'daniel caesar', art: 'art-4' },
    ],
    onRepeat: [
      { trackId: 'ivy', plays: 203 },
      { trackId: 'tadhana', plays: 177 },
    ],
    repeatShare: 55,
  },
}

export const fmt = (s: number) =>
  `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function currentLine(lines: { at: number }[], position: number) {
  let i = -1
  for (let n = 0; n < lines.length; n++) if (lines[n].at <= position) i = n
  return i
}
