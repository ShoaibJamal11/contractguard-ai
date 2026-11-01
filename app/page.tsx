'use client'

import { useState, useCallback } from 'react'
import { FileText, AlertTriangle, Clock } from 'lucide-react'
import StatCard from '@/components/StatCard'
import UploadZone from '@/components/UploadZone'
import ContractsTable from '@/components/ContractsTable'
import ContractDrawer from '@/components/ContractDrawer'
import ToastContainer from '@/components/Toast'
import type { ToastData } from '@/components/Toast'
import { MOCK_CONTRACTS } from '@/data/mock-contracts'
import type { Contract } from '@/types/contract'

export default function DashboardPage() {
  const [contracts, setContracts]       = useState<Contract[]>(MOCK_CONTRACTS)
  const [selectedContract, setSelected] = useState<Contract | null>(null)
  const [drawerOpen, setDrawerOpen]     = useState(false)
  const [toasts, setToasts]             = useState<ToastData[]>([])

  // ── Toast helpers ───────────────────────────────────────────────────────────

  const addToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = crypto.randomUUID()
    setToasts((prev) => [...prev, { id, message, type }])
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // ── Contract actions ────────────────────────────────────────────────────────

  function handleUploadSuccess(newContract: Contract) {
    setContracts((prev) => [newContract, ...prev])

    if (newContract.status === 'Analyzed') {
      // Toast notification
      addToast(`Analysis completed for "${newContract.name}"`, 'success')

      // Auto-open the detail drawer
      setSelected(newContract)
      setDrawerOpen(true)
    } else if (newContract.status === 'Failed') {
      addToast(`Analysis failed for "${newContract.name}"`, 'error')
    }
  }

  function handleView(contract: Contract) {
    setSelected(contract)
    setDrawerOpen(true)
  }

  function handleDelete(id: string) {
    setContracts((prev) => prev.filter((c) => c.id !== id))

    // Close drawer if the deleted contract was being viewed
    if (selectedContract?.id === id) {
      setDrawerOpen(false)
      setSelected(null)
    }
  }

  function handleDrawerClose() {
    setDrawerOpen(false)
    // Keep selectedContract briefly for exit animation, clear after transition
    setTimeout(() => setSelected(null), 300)
  }

  // ── Computed stats ──────────────────────────────────────────────────────────

  const total    = contracts.length
  const highRisk = contracts.filter((c) => c.riskLevel === 'High').length
  const pending  = contracts.filter((c) => c.status === 'Analyzing').length

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-10 px-6 py-8">

        {/* ── Page header ─────────────────────────────────────────────────────── */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Dashboard</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Upload contracts for AI risk analysis and monitor your portfolio.
          </p>
        </div>

        {/* ── KPI stat cards ──────────────────────────────────────────────────── */}
        <section aria-label="Summary statistics">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              title="Total Contracts"
              value={total}
              icon={<FileText size={18} aria-hidden="true" />}
              color="indigo"
              description="All time"
            />
            <StatCard
              title="High Risk"
              value={highRisk}
              icon={<AlertTriangle size={18} aria-hidden="true" />}
              color="red"
              description="Require immediate review"
            />
            <StatCard
              title="Pending Analysis"
              value={pending}
              icon={<Clock size={18} aria-hidden="true" />}
              color="amber"
              description="Queued for AI review"
            />
          </div>
        </section>

        {/* ── Upload zone ─────────────────────────────────────────────────────── */}
        <section aria-label="Upload contract">
          <h2 className="mb-3 text-base font-semibold text-white">Upload Contract</h2>
          <UploadZone onUploadSuccess={handleUploadSuccess} />
        </section>

        {/* ── Contracts table ─────────────────────────────────────────────────── */}
        <section aria-label="Analyzed contracts">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-white">Analyzed Contracts</h2>
            <span className="rounded-full border border-white/[0.06] bg-zinc-800 px-2.5 py-0.5 text-xs text-zinc-400">
              {total}
            </span>
          </div>
          <ContractsTable
            contracts={contracts}
            onView={handleView}
            onDelete={handleDelete}
          />
        </section>

      </div>

      {/* ── Contract detail drawer ──────────────────────────────────────────── */}
      <ContractDrawer
        contract={selectedContract}
        open={drawerOpen}
        onClose={handleDrawerClose}
      />

      {/* ── Toast notifications ─────────────────────────────────────────────── */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </>
  )
}
