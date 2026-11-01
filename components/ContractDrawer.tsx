'use client'

import { useEffect, useRef } from 'react'
import {
  X,
  FileText,
  Calendar,
  HardDrive,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
  AlertTriangle,
  CheckCircle2,
  Info,
} from 'lucide-react'
import RiskBadge from './RiskBadge'
import type { Contract } from '@/types/contract'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ContractDrawerProps {
  contract: Contract | null
  open: boolean
  onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ─── Risk-specific recommendations ───────────────────────────────────────────

const RECOMMENDATIONS: Record<string, { icon: typeof AlertTriangle; items: string[] }> = {
  High: {
    icon: ShieldAlert,
    items: [
      'Escalate to senior legal counsel immediately.',
      'Do not execute the contract until all flagged clauses are renegotiated.',
      'Schedule a clause-by-clause review meeting with the counterparty.',
      'Request a redline version addressing liability caps and indemnification limits.',
    ],
  },
  Medium: {
    icon: ShieldQuestion,
    items: [
      'Review the flagged sections with your legal team before signing.',
      'Negotiate improved terms on pricing escalation and SLA commitments.',
      'Ensure compliance addenda meet your jurisdiction\u2019s requirements.',
      'Consider adding a termination-for-convenience clause if absent.',
    ],
  },
  Low: {
    icon: ShieldCheck,
    items: [
      'Contract is within acceptable risk parameters.',
      'Proceed to signature workflow after a final read-through.',
      'File the executed copy in the contract management system.',
    ],
  },
  Pending: {
    icon: ShieldQuestion,
    items: [
      'Analysis is still in progress — recommendations will appear when complete.',
    ],
  },
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ContractDrawer({ contract, open, onClose }: ContractDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    if (open) {
      document.addEventListener('keydown', handleKey)
      // Prevent body scroll while drawer is open
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', handleKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  // Focus trap — focus panel on open
  useEffect(() => {
    if (open && panelRef.current) {
      panelRef.current.focus()
    }
  }, [open])

  if (!contract) return null

  const rec = RECOMMENDATIONS[contract.riskLevel] ?? RECOMMENDATIONS.Pending
  const RecIcon = rec.icon

  const riskColorMap: Record<string, string> = {
    High:    'text-red-400',
    Medium:  'text-amber-400',
    Low:     'text-emerald-400',
    Pending: 'text-zinc-400',
  }

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        className={[
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* ── Drawer panel ──────────────────────────────────────────────────── */}
      <aside
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={`Contract details: ${contract.name}`}
        className={[
          'fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col',
          'border-l border-white/[0.06] bg-zinc-900 shadow-2xl',
          'transition-transform duration-300 ease-out',
          'focus:outline-none',
          open ? 'translate-x-0' : 'translate-x-full',
        ].join(' ')}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between border-b border-white/[0.06] px-6 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-zinc-800">
              <FileText size={16} className="text-zinc-400" aria-hidden="true" />
            </div>
            <h2 className="truncate text-base font-semibold text-white" title={contract.name}>
              {contract.name}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-2 text-zinc-400 transition-colors hover:bg-white/[0.04] hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
            aria-label="Close drawer"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Body (scrollable) ─────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">
          <div className="space-y-6 px-6 py-6">

            {/* Meta grid */}
            <div className="grid grid-cols-2 gap-4">
              <MetaItem
                icon={<Calendar size={14} className="text-zinc-500" />}
                label="Uploaded"
                value={formatDate(contract.uploadedAt)}
                sub={formatTime(contract.uploadedAt)}
              />
              <MetaItem
                icon={<HardDrive size={14} className="text-zinc-500" />}
                label="File Size"
                value={contract.fileSize ?? '—'}
              />
            </div>

            {/* Risk level */}
            <div className="rounded-xl border border-white/[0.06] bg-zinc-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  Risk Level
                </span>
                <RiskBadge level={contract.riskLevel} />
              </div>
            </div>

            {/* AI Summary */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-indigo-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold text-white">AI Risk Summary</h3>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-zinc-800/50 p-4">
                {contract.summary ? (
                  <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-line">
                    {contract.summary}
                  </p>
                ) : (
                  <p className="text-sm italic text-zinc-500">
                    No summary available for this contract.
                  </p>
                )}
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <RecIcon
                  size={14}
                  className={riskColorMap[contract.riskLevel] ?? 'text-zinc-400'}
                  aria-hidden="true"
                />
                <h3 className="text-sm font-semibold text-white">Recommendations</h3>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-zinc-800/50 p-4">
                <ul className="space-y-2.5">
                  {rec.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <CheckCircle2
                        size={14}
                        className={[
                          'mt-0.5 flex-shrink-0',
                          riskColorMap[contract.riskLevel] ?? 'text-zinc-500',
                        ].join(' ')}
                        aria-hidden="true"
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

          </div>
        </div>

        {/* ── Footer ────────────────────────────────────────────────────── */}
        <div className="border-t border-white/[0.06] px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-white/[0.06] bg-zinc-800 px-4 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-white focus-visible:ring-2 focus-visible:ring-indigo-500"
          >
            Close
          </button>
        </div>
      </aside>
    </>
  )
}

// ─── Meta item ────────────────────────────────────────────────────────────────

function MetaItem({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-zinc-800/50 p-3.5">
      <div className="mb-2 flex items-center gap-1.5">
        {icon}
        <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-zinc-200">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-zinc-500">{sub}</p>}
    </div>
  )
}
