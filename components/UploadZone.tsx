'use client'

import { useCallback, useState } from 'react'
import { useDropzone } from 'react-dropzone'
import {
  UploadCloud,
  FileCheck2,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import type { Contract } from '@/types/contract'
import type { AnalyzeResponse } from '@/types/contract'

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

interface UploadZoneProps {
  onUploadSuccess: (contract: Contract) => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UploadZone({ onUploadSuccess }: UploadZoneProps) {
  const [uploadState, setUploadState]   = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [fileName, setFileName]         = useState('')

  // ── Drop handler ────────────────────────────────────────────────────────────
  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0]
      if (!file) return

      setFileName(file.name)
      setUploadState('uploading')
      setErrorMessage('')

      const body = new FormData()
      body.append('file', file)

      try {
        const res  = await fetch('/api/analyze', { method: 'POST', body })
        const json: AnalyzeResponse = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.error ?? `Server error (${res.status})`)
        }

        // Analysis is synchronous — the API already returned the result, so
        // status is 'Analyzed' immediately (not 'Analyzing').
        const newContract: Contract = {
          id:         json.data?.contractId ?? crypto.randomUUID(),
          name:       file.name.replace(/\.pdf$/i, ''),
          uploadedAt: new Date().toISOString(),
          status:     'Analyzed',
          riskLevel:  json.data?.riskLevel ?? 'Pending',
          fileSize:   `${(file.size / 1024 / 1024).toFixed(1)} MB`,
          summary:    json.data?.summary,
        }

        onUploadSuccess(newContract)
        setUploadState('success')

        // Auto-reset after 3 s so the user can drop another file
        setTimeout(() => {
          setUploadState('idle')
          setFileName('')
        }, 3000)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed. Please try again.'

        // Add a Failed row to the table so the user can see which file errored
        onUploadSuccess({
          id:         crypto.randomUUID(),
          name:       file.name.replace(/\.pdf$/i, ''),
          uploadedAt: new Date().toISOString(),
          status:     'Failed',
          riskLevel:  'Pending',
          fileSize:   `${(file.size / 1024 / 1024).toFixed(1)} MB`,
        })

        setUploadState('error')
        setErrorMessage(message)
      }
    },
    [onUploadSuccess]
  )

  // ── Dropzone config ─────────────────────────────────────────────────────────
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept:   { 'application/pdf': ['.pdf'] },
    maxSize:  10 * 1024 * 1024,   // 10 MB
    multiple: false,
    disabled: uploadState === 'uploading',
    onDropRejected(rejections) {
      const code = rejections[0]?.errors[0]?.code
      setUploadState('error')
      if (code === 'file-too-large') {
        setErrorMessage('File exceeds the 10 MB limit. Please use a smaller PDF.')
      } else if (code === 'file-invalid-type') {
        setErrorMessage('Only PDF files are accepted (.pdf).')
      } else {
        setErrorMessage('Invalid file. Please try again.')
      }
    },
  })

  // ── Border / background class ───────────────────────────────────────────────
  const wrapperCls = [
    'relative rounded-xl border-2 border-dashed p-10 text-center',
    'cursor-pointer outline-none transition-all duration-200',
    'focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
    uploadState === 'uploading'
      ? 'pointer-events-none border-zinc-700 bg-zinc-900/40 opacity-70'
      : isDragActive
      ? 'border-indigo-500 bg-indigo-500/5'
      : uploadState === 'success'
      ? 'border-emerald-500/50 bg-emerald-500/5'
      : uploadState === 'error'
      ? 'border-red-500/40 bg-red-500/5'
      : 'border-zinc-700 bg-zinc-900/50 hover:border-zinc-500 hover:bg-zinc-900',
  ].join(' ')

  // ── Render helper ───────────────────────────────────────────────────────────
  function renderContent() {
    if (isDragActive && uploadState !== 'uploading') {
      return (
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <UploadCloud size={36} className="text-indigo-400 animate-bounce" aria-hidden="true" />
          <p className="text-base font-medium text-indigo-300">Drop your PDF now</p>
        </div>
      )
    }

    switch (uploadState) {
      case 'uploading':
        return (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <Loader2 size={36} className="animate-spin-slow text-indigo-400" aria-hidden="true" />
            <div>
              <p className="text-base font-medium text-white">Uploading &amp; analyzing…</p>
              <p className="mt-1 text-sm text-zinc-500 truncate max-w-xs mx-auto">{fileName}</p>
            </div>
          </div>
        )

      case 'success':
        return (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
              <FileCheck2 size={24} className="text-emerald-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-medium text-emerald-400">Queued for analysis!</p>
              <p className="mt-1 text-sm text-zinc-500">Drop another PDF to continue.</p>
            </div>
          </div>
        )

      case 'error':
        return (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
              <AlertCircle size={24} className="text-red-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-medium text-red-400" role="alert">
                {errorMessage || 'Upload failed'}
              </p>
              <p className="mt-1 text-sm text-zinc-500">Click or drag a PDF to try again.</p>
            </div>
          </div>
        )

      default: // idle
        return (
          <div className="flex flex-col items-center gap-3 animate-fade-in">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
              <UploadCloud size={24} className="text-indigo-400" aria-hidden="true" />
            </div>
            <div>
              <p className="text-base font-medium text-white">
                Drop a PDF here, or{' '}
                <span className="text-indigo-400 underline underline-offset-2">browse</span>
              </p>
              <p className="mt-1 text-sm text-zinc-500">PDF only · max 10 MB per file</p>
            </div>
          </div>
        )
    }
  }

  return (
    <div
      {...getRootProps({ className: wrapperCls })}
      aria-label="PDF upload area. Drag and drop a contract PDF here, or press Enter to open the file picker."
    >
      <input {...getInputProps()} aria-label="Select PDF file" />
      {renderContent()}
    </div>
  )
}

