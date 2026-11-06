import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { TypingBubble } from './TypingBubble.tsx'

// Folder icons on the right edge and heyclicky-style stickers. Decoration, plus folder shortcuts.

// Mac OS X folder icons in the dock's style: ryOS's music folder, plus liked and loved
// folders made from its plain folder with an embossed thumb and heart.
function DesktopIcon({ src }: { src: string }) {
  return (
    <img
      src={src}
      alt=""
      width={56}
      height={56}
      className="mx-auto mb-0.5 drop-shadow-[0_2px_2px_rgb(0_0_0/0.25)]"
    />
  )
}

export function DesktopClutter() {
  const { show, toIpod } = useDesktop()
  const { loved, liked } = usePlayer()
  const folders = [
    { label: 'library', icon: '/icons/sounds.png' },
    { label: `liked songs (${liked.size})`, icon: '/icons/liked-folder.png' },
    { label: `loved ♥ (${loved.size})`, icon: '/icons/loved-folder.png' },
  ]
  return (
    <>
      <div className="fixed top-10 right-4 z-[5] flex flex-col gap-4">
        {folders.map((f) => (
          <button
            key={f.label}
            type="button"
            onDoubleClick={() => show('library')}
            onClick={() => show('library')}
            className="w-24 text-center text-[11px] text-body"
          >
            <DesktopIcon src={f.icon} />
            <span className="rounded-sm bg-window/70 px-1">{f.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={toIpod}
          aria-label="bring back the ipod"
          className="w-24 text-center text-[11px] text-body"
        >
          <DesktopIcon src="/icons/ipod.png" />
          <span className="rounded-sm bg-window/70 px-1">ipod</span>
        </button>
      </div>
      <button
        type="button"
        onClick={() => show('terminal')}
        aria-label="open terminal: stats for nerds"
        className="fixed top-[300px] right-[150px] z-[5] w-24 text-center text-[11px] text-body"
      >
        <DesktopIcon src="/icons/terminal.png" />
        <span className="rounded-sm bg-window/70 px-1">terminal</span>
      </button>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[4] select-none"
      >
        <TypingBubble
          text="memory: every lyric from 2009. not why i walked into this room"
          className="absolute top-[132px] right-[112px] w-[150px] rotate-[-2deg]"
        />
        <img
          src="/kitten.jpg"
          alt=""
          width={76}
          height={76}
          className="absolute top-9 right-[140px] rotate-[-8deg] rounded-[3px] shadow-sticker"
        />
        <span className="absolute bottom-6 left-8 text-[44px]">🖥️</span>
        <span className="absolute right-[330px] bottom-8 text-[36px]">👾</span>
        <span className="absolute right-6 bottom-10 text-[14px] text-body">
          (ﾉ◕ヮ◕)ﾉ*:・ﾟ✧
        </span>
      </div>
    </>
  )
}
