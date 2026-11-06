// Spotify's embed player, driven by the iPod. No login: visitors hear 30-second previews, or full
// songs if they're logged into Spotify in the same browser. The embed sits in the page but invisible
// (browsers won't load or start a player that's off screen). If the browser still blocks playback,
// it pops up so the visitor can press Spotify's own play button once.
// API: https://developer.spotify.com/documentation/embeds/references/iframe-api

type Update = {
  isPaused: boolean
  isBuffering: boolean
  duration: number // ms
  position: number // ms
}

type Controller = {
  loadUri: (uri: string) => void
  play: () => void
  pause: () => void
  resume: () => void
  seek: (seconds: number) => void
  addListener: (event: string, cb: (e: { data: Update }) => void) => void
}

type IFrameApi = {
  createController: (
    el: HTMLElement,
    options: { uri: string; width: number | string; height: number },
    cb: (c: Controller) => void,
  ) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void
  }
}

const SCRIPT = 'https://open.spotify.com/embed/iframe-api/v1'
// How long to wait for Spotify to report playback before asking for a tap.
const STALL_MS = 4000

// Shows in the browser console, to see where playback stops.
const log = (...args: unknown[]) => console.info('[stimbox spotify]', ...args)

class SpotifyEmbed {
  private api: Promise<IFrameApi> | null = null
  private controller: Promise<Controller> | null = null
  private host: Promise<HTMLElement>
  private setHostEl: (el: HTMLElement) => void = () => {}
  private uri = ''
  private listeners = new Set<(u: Update) => void>()
  private ready: Promise<void> = Promise.resolve()
  private markReady: () => void = () => {}
  private stallTimer: number | null = null
  private stalled = false
  private stallSubs = new Set<() => void>()
  private started = false
  // false after pause(): a stop we asked for, not the song ending
  private wanted = false

  constructor() {
    this.host = new Promise((resolve) => (this.setHostEl = resolve))
  }

  // Called once by <SpotifyEmbedHost> with the element the player lives in.
  setHost(el: HTMLElement) {
    this.setHostEl(el)
  }

  private expectReady() {
    this.ready = new Promise((resolve) => (this.markReady = resolve))
    // Some loads never fire "ready" again; don't wait forever.
    window.setTimeout(() => this.markReady(), 2500)
  }

  private loadApi() {
    this.api ??= new Promise((resolve, reject) => {
      window.onSpotifyIframeApiReady = resolve
      const s = document.createElement('script')
      s.src = SCRIPT
      s.async = true
      s.onerror = (e) => {
        // Let the next press of play try again.
        this.api = null
        this.controller = null
        this.uri = ''
        reject(e)
      }
      document.body.append(s)
    })
    return this.api
  }

  private ensure(uri: string) {
    this.controller ??= Promise.all([this.loadApi(), this.host]).then(
      ([api, host]) =>
        new Promise<Controller>((resolve) => {
          const el = document.createElement('div')
          host.append(el)
          this.expectReady()
          log('creating player')
          api.createController(el, { uri, width: '100%', height: 80 }, (c) => {
            c.addListener('ready', () => {
              log('player ready')
              this.markReady()
            })
            c.addListener('playback_update', (e) => {
              if (!e.data.isPaused) this.setStalled(false)
              this.listeners.forEach((fn) => fn(e.data))
            })
            // Chromium only lets a cross-origin player start sound if the iframe was LOADED with
            // allow="autoplay". Adding it later does nothing, so reload the frame once with it.
            const frame = host.querySelector('iframe')
            const allow = frame?.getAttribute('allow') ?? ''
            log('iframe allow =', allow || '(none)')
            if (frame && !allow.includes('autoplay')) {
              frame.setAttribute(
                'allow',
                `autoplay; encrypted-media; ${allow}`.trim(),
              )
              this.expectReady()
              const src = frame.src
              frame.src = src
              log('reloaded iframe with autoplay')
            }
            resolve(c)
          })
        }),
    )
    this.uri ||= uri
    return this.controller
  }

  private setStalled(v: boolean) {
    if (this.stallTimer !== null) window.clearTimeout(this.stallTimer)
    this.stallTimer = null
    if (this.stalled === v) return
    this.stalled = v
    this.stallSubs.forEach((fn) => fn())
  }

  private watchForStall() {
    if (this.stallTimer !== null) window.clearTimeout(this.stallTimer)
    this.stallTimer = window.setTimeout(() => this.setStalled(true), STALL_MS)
  }

  subscribeStalled = (fn: () => void) => {
    this.stallSubs.add(fn)
    return () => {
      this.stallSubs.delete(fn)
    }
  }

  isStalled = () => this.stalled

  onUpdate(fn: (u: Update) => void) {
    this.listeners.add(fn)
    return () => {
      this.listeners.delete(fn)
    }
  }

  // Load the player early (on the current song) so the first press of play is instant.
  async cue(uri: string) {
    if (uri === this.uri) return
    try {
      const c = await this.ensure(uri)
      if (uri !== this.uri && !this.started) {
        this.expectReady()
        c.loadUri(uri)
        this.uri = uri
      }
    } catch (err) {
      log('could not load the player', err)
    }
  }

  wantsToPlay = () => this.wanted
  private seekedAt = 0
  justSeeked = () => Date.now() - this.seekedAt < 2000
  log = log

  async play(uri: string) {
    this.wanted = true
    // Start watching right away, so the player pops up even if loading it hangs.
    this.watchForStall()
    try {
      const c = await this.ensure(uri)
      if (uri !== this.uri) {
        this.expectReady()
        c.loadUri(uri)
        this.uri = uri
        this.started = false
      }
      await this.ready
      if (this.started) c.resume()
      else c.play()
      this.started = true
      log('play sent', uri)
    } catch (err) {
      log('could not start playback', err)
      this.setStalled(true)
    }
  }

  async pause() {
    this.wanted = false
    this.setStalled(false)
    if (this.controller) (await this.controller).pause()
  }

  async seek(seconds: number) {
    this.seekedAt = Date.now()
    if (this.controller) (await this.controller).seek(seconds)
  }
}

export const spotifyEmbed = new SpotifyEmbed()
export type { Update as EmbedUpdate }
