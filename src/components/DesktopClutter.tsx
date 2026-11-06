import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'
import { TypingBubble } from './TypingBubble.tsx'

// Folders on the right edge and heyclicky-style stickers. Decoration, plus folder shortcuts.

function FolderIcon({ pink = false }: { pink?: boolean }) {
  return (
    <svg
      viewBox="0 0 54 44"
      width={54}
      height={44}
      aria-hidden
      className="mx-auto mb-0.5"
    >
      <path
        d="M2 8a4 4 0 0 1 4-4h14l5 5h23a4 4 0 0 1 4 4v25a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"
        className={pink ? 'fill-pink' : 'fill-aqua'}
      />
      <path
        d="M2 15h50v23a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4z"
        className={pink ? 'fill-pink-soft' : 'fill-aqua-hi'}
      />
    </svg>
  )
}

export function DesktopClutter() {
  const { show, toIpod } = useDesktop()
  const { loved, liked } = usePlayer()
  const folders = [
    { label: 'library', pink: false },
    { label: `liked songs (${liked.size})`, pink: false },
    { label: `loved ♥ (${loved.size})`, pink: true },
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
            <FolderIcon pink={f.pink} />
            <span className="rounded-sm bg-window/70 px-1">{f.label}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={toIpod}
          aria-label="bring back the ipod"
          className="w-24 text-center text-[11px] text-body"
        >
          <img
            src="/icons/ipod.png"
            alt=""
            width={44}
            height={44}
            className="mx-auto mb-0.5 drop-shadow-[0_2px_2px_rgb(0_0_0/0.3)]"
          />
          <span className="rounded-sm bg-window/70 px-1">ipod</span>
        </button>
      </div>
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
