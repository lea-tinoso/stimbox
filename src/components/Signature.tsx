// The maker's mark, as a Mac OS X Stickies note. Same card as Lea's other projects (Abbott).
export function Signature() {
  return (
    <aside
      aria-label="about the creator"
      className="fixed bottom-2 left-24 z-[6] w-[300px] -rotate-2 border border-yellow-edge bg-yellow shadow-[0_12px_24px_rgb(0_0_0/0.22),0_0_0_0.5px_rgb(0_0_0/0.25)]"
    >
      <div
        aria-hidden
        className="flex h-3.5 items-center border-b border-yellow-edge bg-gradient-to-b from-yellow-hi to-yellow px-1"
      >
        <span className="size-[9px] border border-yellow-ink bg-yellow-hi" />
        <span className="ml-auto size-[9px] border border-yellow-ink bg-yellow-hi" />
      </div>
      <div className="px-3.5 pt-2.5 pb-3">
        <div className="flex items-center gap-2.5">
          <img
            src="/lea.svg"
            alt="cartoon portrait of lea"
            width={44}
            height={44}
            className="rounded-full shadow-[0_0_0_3px_white,0_3px_6px_rgb(0_0_0/0.15)]"
          />
          <p className="font-hand text-[27px] leading-none text-ink">
            created by lea
          </p>
        </div>
        <p className="mt-1.5 font-hand text-[19px] leading-[1.1] text-body">
          software engineer who loops one song until her ai agents ship the
          feature. currently on play 48 ♪
        </p>
        <p className="mt-2 text-[11px] text-mute">
          <a
            href="https://github.com/lea-tinoso/stimbox#readme"
            target="_blank"
            rel="noreferrer"
            className="text-aqua-deep underline hover:text-selection"
          >
            how it&apos;s made ↗
          </a>
          <span aria-hidden> · </span>
          <a
            href="https://lea-showcase.vercel.app"
            target="_blank"
            rel="noreferrer"
            className="text-aqua-deep underline hover:text-selection"
          >
            portfolio ↗
          </a>
        </p>
      </div>
    </aside>
  )
}
