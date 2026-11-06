// Spotify's embed player, driven by the iPod. No login: visitors hear 30-second previews, or full
// songs if they're logged into Spotify in the same browser. The embed sits off screen; the iPod and
// the now playing window are its controls.
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
    options: { uri: string; width: number; height: number },
    cb: (c: Controller) => void,
  ) => void
}

declare global {
  interface Window {
    onSpotifyIframeApiReady?: (api: IFrameApi) => void
  }
}

const SCRIPT = 'https://open.spotify.com/embed/iframe-api/v1'

class SpotifyEmbed {
  private api: Promise<IFrameApi> | null = null
  private controller: Promise<Controller> | null = null
  private uri = ''
  private listeners = new Set<(u: Update) => void>()

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
    this.controller ??= this.loadApi().then(
      (api) =>
        new Promise<Controller>((resolve) => {
          const host = document.createElement('div')
          host.setAttribute('aria-hidden', 'true')
          host.style.cssText =
            'position:fixed;left:-10000px;top:0;width:300px;height:80px'
          const el = document.createElement('div')
          host.append(el)
          document.body.append(host)
          api.createController(el, { uri, width: 300, height: 80 }, (c) => {
            c.addListener('playback_update', (e) =>
              this.listeners.forEach((fn) => fn(e.data)),
            )
            resolve(c)
          })
        }),
    )
    return this.controller
  }

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
      if (!fresh) c.loadUri(uri)
      this.uri = uri
      c.play()
    } else c.resume()
  }

  async pause() {
    if (this.controller) (await this.controller).pause()
  }

  async seek(seconds: number) {
    if (this.controller) (await this.controller).seek(seconds)
  }
}

export const spotifyEmbed = new SpotifyEmbed()
export type { Update as EmbedUpdate }
