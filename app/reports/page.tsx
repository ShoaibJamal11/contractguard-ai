import { BarChart2 } from 'lucide-react'

export default function ReportsPage() {
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <h1 className="text-2xl font-bold tracking-tight text-white">Reports</h1>
      <p className="mt-1 text-sm text-zinc-500">Portfolio analytics — coming soon.</p>
      <div className="mt-12 flex flex-col items-center justify-center rounded-xl border border-white/[0.06] bg-zinc-900 py-20 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-zinc-800">
          <BarChart2 size={24} className="text-zinc-600" aria-hidden="true" />
        </div>
        <p className="text-sm font-medium text-zinc-400">Risk analytics &amp; trends</p>
        <p className="mt-1 text-xs text-zinc-600">Portfolio-level insights and exportable reports will live here.</p>
      </div>
    </div>
  )
}

