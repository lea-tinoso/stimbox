import type { ComponentProps } from 'react'

// Aqua pill button. Pass `pressed` for toggles and segmented tabs.
export function Pill({
  pressed,
  className = '',
  ...props
}: ComponentProps<'button'> & { pressed?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      className={`aqua-pill rounded-pill border border-hairline px-3 py-0.5 text-[11px] whitespace-nowrap text-ink transition-[filter] hover:brightness-95 active:brightness-90 ${className}`}
      {...props}
    />
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1.5">
      {options.map((o) => (
        <Pill
          key={o.value}
          pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </Pill>
      ))}
    </div>
  )
}
