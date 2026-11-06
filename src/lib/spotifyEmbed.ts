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
      s.onerror = reject
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
          api.createController(el, { uri, width: '100%', height: 80 }, (c) => {
            c.addListener('ready', () => this.markReady())
            c.addListener('playback_update', (e) => {
              if (!e.data.isPaused) this.setStalled(false)
              this.listeners.forEach((fn) => fn(e.data))
            })
            // Let the player start sound after a click on our page.
            const frame = host.querySelector('iframe')
            const allow = frame?.getAttribute('allow') ?? ''
            if (frame && !allow.includes('autoplay'))
              frame.setAttribute(
                'allow',
                `autoplay; encrypted-media; ${allow}`.trim(),
              )
            resolve(c)
          })
        }),
    )
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

  async play(uri: string) {
    const fresh = !this.controller
    const c = await this.ensure(uri)
    if (uri !== this.uri) {
      if (!fresh) {
        this.expectReady()
        c.loadUri(uri)
      }
      this.uri = uri
      await this.ready
      c.play()
    } else c.resume()
    this.watchForStall()
  }

  async pause() {
    this.setStalled(false)
    if (this.controller) (await this.controller).pause()
  }

  async seek(seconds: number) {
    if (this.controller) (await this.controller).seek(seconds)
  }
}

export const spotifyEmbed = new SpotifyEmbed()
export type { Update as EmbedUpdate }
