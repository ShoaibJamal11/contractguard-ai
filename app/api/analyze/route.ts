import { NextRequest } from 'next/server'
import type { AnalyzeResponse, RiskLevel } from '@/types/contract'

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES      = 10 * 1024 * 1024   // 10 MB
const TIMEOUT_MS     = 30_000             // 30 s

// ─── POST /api/analyze ────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {

  // 1. Parse multipart/form-data ──────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return Response.json(
      { success: false, error: 'Could not parse form data. Send multipart/form-data.' } satisfies AnalyzeResponse,
      { status: 400 }
    )
  }

  // 2. Validate "file" field ──────────────────────────────────────────────────
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return Response.json(
      { success: false, error: 'No file found. Include a "file" field in the form data.' } satisfies AnalyzeResponse,
      { status: 400 }
    )
  }

  // 3. Validate MIME type ─────────────────────────────────────────────────────
  if (file.type !== 'application/pdf') {
    return Response.json(
      { success: false, error: 'Unsupported file type. Only PDF files are accepted.' } satisfies AnalyzeResponse,
      { status: 415 }
    )
  }

  // 4. Validate file size ─────────────────────────────────────────────────────
  if (file.size > MAX_BYTES) {
    return Response.json(
      { success: false, error: `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 10 MB.` } satisfies AnalyzeResponse,
      { status: 413 }
    )
  }

  // 5. Resolve webhook URL ────────────────────────────────────────────────────
  const webhookUrl = process.env.N8N_WEBHOOK_URL
  if (!webhookUrl) {
    return Response.json(
      { success: false, error: 'N8N_WEBHOOK_URL is not configured on the server.' } satisfies AnalyzeResponse,
      { status: 503 }
    )
  }

  // 6. Forward PDF to n8n via multipart/form-data ────────────────────────────
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const outForm = new FormData()
    outForm.append('file', file, file.name)   // include original filename

    const headers: HeadersInit = {}
    if (process.env.N8N_WEBHOOK_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`
    }

    const n8nRes = await fetch(webhookUrl, {
      method:  'POST',
      headers,
      body:    outForm,
      signal:  controller.signal,
    })

    clearTimeout(timeout)

    if (!n8nRes.ok) {
      const text = await n8nRes.text().catch(() => '')
      console.error(`[ContractGuard] n8n responded ${n8nRes.status}:`, text)
      return Response.json(
        { success: false, error: `Analysis service returned ${n8nRes.status}. Check your n8n workflow.` } satisfies AnalyzeResponse,
        { status: 502 }
      )
    }

    // 7. Parse n8n response ───────────────────────────────────────────────────
    //    Expected n8n output: { riskLevel: "High" | "Medium" | "Low", summary?: string }
    //    Falls back to "Pending" if n8n returns nothing or an unexpected shape.
    let riskLevel: RiskLevel = 'Pending'
    let summary: string | undefined

    try {
      const body = await n8nRes.json() as { riskLevel?: RiskLevel; summary?: string }
      if (body.riskLevel) riskLevel = body.riskLevel
      summary = body.summary
    } catch {
      // n8n returned 200 but no JSON body — still treat as success
      console.warn('[ContractGuard] n8n returned 200 but no parseable JSON body.')
    }

    // 8. Return success ───────────────────────────────────────────────────────
    return Response.json({
      success: true,
      data: {
        contractId: crypto.randomUUID(),
        riskLevel,
        summary,
      },
    } satisfies AnalyzeResponse)

  } catch (err) {
    clearTimeout(timeout)

    if ((err as Error).name === 'AbortError') {
      return Response.json(
        { success: false, error: 'Request timed out after 30 s. Check that your n8n instance is running.' } satisfies AnalyzeResponse,
        { status: 504 }
      )
    }

    console.error('[ContractGuard] Failed to reach n8n:', err)
    return Response.json(
      { success: false, error: 'Could not reach the n8n analysis service. Is it running?' } satisfies AnalyzeResponse,
      { status: 502 }
    )
  }
}
