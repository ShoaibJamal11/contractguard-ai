import type { RiskLevel } from '@/types/contract'

interface RiskBadgeProps {
  level: RiskLevel
}

const CONFIG: Record<
  RiskLevel,
  { label: string; className: string }
> = {
  High: {
    label: 'High',
    className:
      'border-red-500/20 bg-red-500/10 text-red-400',
  },
  Medium: {
    label: 'Medium',
    className:
      'border-amber-500/20 bg-amber-500/10 text-amber-400',
  },
  Low: {
    label: 'Low',
    className:
      'border-emerald-500/20 bg-emerald-500/10 text-emerald-400',
  },
  Pending: {
    label: 'Pending',
    className:
      'border-zinc-600/40 bg-zinc-700/20 text-zinc-400 animate-pulse-subtle',
  },
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const { label, className } = CONFIG[level]
  return (
    <span
      className={[
        'inline-flex items-center rounded-full border px-2.5 py-0.5',
        'text-[11px] font-semibold uppercase tracking-wide',
        className,
      ].join(' ')}
    >
      {label}
    </span>
  )
}

