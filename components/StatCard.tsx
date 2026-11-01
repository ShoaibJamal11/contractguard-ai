import type { ReactNode } from 'react'

type AccentColor = 'indigo' | 'red' | 'amber' | 'emerald' | 'zinc'

interface StatCardProps {
  title:       string
  value:       string | number
  description?: string
  icon:        ReactNode
  color?:      AccentColor
}

const colorMap: Record<AccentColor, { icon: string; border: string; glow: string }> = {
  indigo:  { icon: 'text-indigo-400  bg-indigo-500/10  border-indigo-500/20',  border: 'border-white/[0.06]', glow: '' },
  red:     { icon: 'text-red-400     bg-red-500/10     border-red-500/20',     border: 'border-white/[0.06]', glow: '' },
  amber:   { icon: 'text-amber-400   bg-amber-500/10   border-amber-500/20',   border: 'border-white/[0.06]', glow: '' },
  emerald: { icon: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', border: 'border-white/[0.06]', glow: '' },
  zinc:    { icon: 'text-zinc-400    bg-zinc-700/20    border-zinc-600/30',    border: 'border-white/[0.06]', glow: '' },
}

export default function StatCard({
  title,
  value,
  description,
  icon,
  color = 'indigo',
}: StatCardProps) {
  const { icon: iconCls } = colorMap[color]

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-white/[0.06] bg-zinc-900 p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          {title}
        </p>
        <span
          aria-hidden="true"
          className={[
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border',
            iconCls,
          ].join(' ')}
        >
          {icon}
        </span>
      </div>

      <div>
        <p className="text-3xl font-bold tabular-nums text-white">
          {value}
        </p>
        {description && (
          <p className="mt-1 text-xs text-zinc-500">{description}</p>
        )}
      </div>
    </div>
  )
}

