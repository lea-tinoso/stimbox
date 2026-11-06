import { useDesktop } from '../state/desktop.tsx'
import { usePlayer } from '../state/player.tsx'

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
  const { show } = useDesktop()
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
      </div>
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-[4] select-none"
      >
        <div className="absolute top-[360px] right-[60px] rotate-[-4deg] bg-yellow px-3.5 py-3 font-hand text-[22px] leading-none text-ink shadow-sticker">
          ♥ = saved to loved
        </div>
        <div className="absolute bottom-6 left-[200px] w-28 rotate-[-6deg] rounded-lg bg-red px-1 pt-1.5 pb-1 text-center text-[9px] font-bold tracking-wider text-window shadow-sticker">
          HELLO
          <small className="block text-[8px] font-normal tracking-normal">
            my name is
          </small>
          <div className="mt-1 rounded-sm bg-window px-2 pt-1.5 pb-0.5 font-hand text-[22px] tracking-normal text-ink">
            stimbox
          </div>
        </div>
        <span className="absolute top-8 right-[150px] rotate-[-8deg] text-[44px]">
          🐱
        </span>
        <span className="absolute bottom-6 left-8 text-[44px]">🖥️</span>
        <span className="absolute right-[330px] bottom-8 text-[36px]">👾</span>
        <span className="absolute right-6 bottom-10 text-[14px] text-body">
          (ﾉ◕ヮ◕)ﾉ*:・ﾟ✧
        </span>
      </div>
    </>
  )
}
