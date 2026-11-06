import { useState } from 'react'
import { recentSearches, useRecentSearches } from '../lib/recentSearches.ts'
import { useDesktop } from '../state/desktop.tsx'

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden
      className="shrink-0"
    >
      <path
        d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4M12 8v4l3 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" aria-hidden>
      <path
        d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

// The menu bar search box. While it's empty and focused, it lists recent searches
// with a history icon and a trash button each, like YouTube Music.
export function SearchBox({
  query,
  onQuery,
}: {
  query: string
  onQuery: (q: string) => void
}) {
  const { show } = useDesktop()
  const recent = useRecentSearches()
  const [focused, setFocused] = useState(false)
  const showRecent = focused && !query.trim() && recent.length > 0

  return (
    <div className="relative hidden md:block">
      <label>
        <span className="sr-only">search songs, artists, albums</span>
        <input
          type="search"
          name="q"
          autoComplete="off"
          spellCheck={false}
          value={query}
          aria-controls={showRecent ? 'recent-searches' : undefined}
          onChange={(e) => {
            onQuery(e.target.value)
            show('search')
          }}
          onFocus={() => {
            setFocused(true)
            show('search')
          }}
          onBlur={() => {
            setFocused(false)
            recentSearches.add(query)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') recentSearches.add(query)
            if (e.key === 'Escape') e.currentTarget.blur()
          }}
          placeholder="⌕ search songs, artists, albums…"
          className="h-[18px] w-56 rounded-pill border border-hairline bg-window px-2 text-[11px] shadow-[inset_0_1px_2px_rgb(0_0_0/0.25)] placeholder:text-mute"
        />
      </label>
      {showRecent && (
        <ul
          id="recent-searches"
          aria-label="recent searches"
          // keep focus in the input while clicking in the list
          onMouseDown={(e) => e.preventDefault()}
          className="absolute top-[22px] right-0 w-64 overflow-hidden rounded-[5px] border border-hairline bg-window py-1 text-[12px] shadow-window"
        >
          {recent.map((q) => (
            <li
              key={q}
              className="group flex items-center hover:bg-selection hover:text-window"
            >
              <button
                type="button"
                onClick={() => {
                  onQuery(q)
                  recentSearches.add(q)
                  show('search')
                }}
                className="flex min-w-0 flex-1 items-center gap-2.5 px-2.5 py-1 text-left"
              >
                <span className="text-mute group-hover:text-window">
                  <HistoryIcon />
                </span>
                <span className="truncate">{q}</span>
              </button>
              <button
                type="button"
                onClick={() => recentSearches.remove(q)}
                aria-label={`delete ${q} from recent searches`}
                title="delete"
                className="mr-1.5 grid size-6 place-items-center rounded-full text-mute group-hover:text-window hover:bg-window/25"
              >
                <TrashIcon />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
