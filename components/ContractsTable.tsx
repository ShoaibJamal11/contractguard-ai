'use client'

import { FileText, Trash2, Eye, RefreshCw } from 'lucide-react'
import RiskBadge from './RiskBadge'
import type { Contract, ContractStatus } from '@/types/contract'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CLS: Record<ContractStatus, string> = {
  Analyzed:  'border-zinc-600/40 bg-zinc-700/20 text-zinc-300',
  Analyzing: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-300 animate-pulse-subtle',
  Failed:    'border-red-500/20   bg-red-500/10   text-red-400',
}

function StatusBadge({ status }: { status: ContractStatus }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5',
        'text-[11px] font-semibold uppercase tracking-wide',
        STATUS_CLS[status],
      ].join(' ')}
    >
      {status === 'Analyzing' && (
        <RefreshCw size={10} className="animate-spin" aria-hidden="true" />
      )}
      {status}
    </span>
  )
}

// ─── Date formatter (deterministic locale → no hydration mismatch) ────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day:   'numeric',
    year:  'numeric',
  })
}

// ─── Table row ────────────────────────────────────────────────────────────────

interface RowProps {
  contract: Contract
  onView:   (contract: Contract) => void
  onDelete: (id: string) => void
}

function ContractRow({ contract, onView, onDelete }: RowProps) {
  return (
    <tr
      className="group border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] cursor-pointer"
      onClick={() => onView(contract)}
    >
      {/* Name */}
      <td className="px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-zinc-800">
            <FileText size={14} className="text-zinc-400" aria-hidden="true" />
          </div>
          <span className="truncate text-sm font-medium text-zinc-100" title={contract.name}>
            {contract.name}
          </span>
        </div>
      </td>

      {/* Uploaded date */}
      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="text-sm text-zinc-400">{formatDate(contract.uploadedAt)}</span>
      </td>

      {/* Status */}
      <td className="px-4 py-3.5">
        <StatusBadge status={contract.status} />
      </td>

      {/* Risk level */}
      <td className="px-4 py-3.5">
        <RiskBadge level={contract.riskLevel} />
      </td>

      {/* File size */}
      <td className="whitespace-nowrap px-4 py-3.5">
        <span className="text-xs text-zinc-500">{contract.fileSize ?? '—'}</span>
      </td>

      {/* Actions */}
      <td className="px-4 py-3.5 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          <button
            aria-label={`View details for ${contract.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onView(contract)
            }}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-indigo-500/10 hover:text-indigo-400"
          >
            <Eye size={15} />
          </button>
          <button
            aria-label={`Delete ${contract.name}`}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(contract.id)
            }}
            className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </td>
    </tr>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-white/[0.06] bg-zinc-800">
        <FileText size={24} className="text-zinc-600" aria-hidden="true" />
      </div>
      <p className="text-sm font-medium text-zinc-400">No contracts yet</p>
      <p className="mt-1 text-xs text-zinc-600">
        Upload a PDF above to begin analysis.
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ContractsTableProps {
  contracts: Contract[]
  onView:    (contract: Contract) => void
  onDelete:  (id: string) => void
}

export default function ContractsTable({ contracts, onView, onDelete }: ContractsTableProps) {
  if (contracts.length === 0) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-zinc-900">
        <EmptyState />
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-zinc-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/[0.06] bg-white/[0.02]">
              {['Contract Name', 'Uploaded', 'Status', 'Risk Level', 'Size', 'Actions'].map(
                (col) => (
                  <th
                    key={col}
                    className={[
                      'px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500',
                      col === 'Actions' ? 'text-right' : '',
                    ].join(' ')}
                  >
                    {col}
                  </th>
                )
              )}
            </tr>
          </thead>
          <tbody>
            {contracts.map((c) => (
              <ContractRow key={c.id} contract={c} onView={onView} onDelete={onDelete} />
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer row count */}
      <div className="border-t border-white/[0.04] px-4 py-2.5">
        <p className="text-[11px] text-zinc-600">
          {contracts.length} contract{contracts.length !== 1 ? 's' : ''}
        </p>
      </div>
    </div>
  )
}
