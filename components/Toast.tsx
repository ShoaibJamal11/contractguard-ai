'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, X } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ToastData {
  id: string
  message: string
  type: 'success' | 'error'
}

interface ToastProps {
  toast: ToastData
  onDismiss: (id: string) => void
}

// ─── Single toast ─────────────────────────────────────────────────────────────

function ToastItem({ toast, onDismiss }: ToastProps) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onDismiss(toast.id), 300)
    }, 4000)
    return () => clearTimeout(timer)
  }, [toast.id, onDismiss])

  const isSuccess = toast.type === 'success'

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'pointer-events-auto flex w-full max-w-sm items-center gap-3',
        'rounded-xl border px-4 py-3 shadow-2xl backdrop-blur-sm',
        'transition-all duration-300 ease-out',
        leaving ? 'animate-toast-out' : 'animate-toast-in',
        isSuccess
          ? 'border-emerald-500/20 bg-zinc-900/95 text-emerald-400'
          : 'border-red-500/20 bg-zinc-900/95 text-red-400',
      ].join(' ')}
    >
      {isSuccess ? (
        <CheckCircle2 size={18} className="flex-shrink-0 text-emerald-400" aria-hidden="true" />
      ) : (
        <XCircle size={18} className="flex-shrink-0 text-red-400" aria-hidden="true" />
      )}

      <p className="flex-1 text-sm font-medium text-zinc-200">{toast.message}</p>

      <button
        onClick={() => {
          setLeaving(true)
          setTimeout(() => onDismiss(toast.id), 300)
        }}
        className="flex-shrink-0 rounded-lg p-1 text-zinc-500 transition-colors hover:text-white"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  )
}

// ─── Toast container ──────────────────────────────────────────────────────────

interface ToastContainerProps {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export default function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      aria-label="Notifications"
      className="pointer-events-none fixed bottom-6 right-6 z-50 flex flex-col-reverse gap-2"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  )
}

