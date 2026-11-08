import { NextRequest } from 'next/server'
import * as pdfParseModule from 'pdf-parse'
import type { AnalyzeResponse, RiskLevel } from '@/types/contract'

// pdf-parse ships CJS; under Turbopack the default lives on .default or the module itself
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
  (pdfParseModule as any).default ?? (pdfParseModule as any)

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES  = 10 * 1024 * 1024   // 10 MB
const TIMEOUT_MS = 30_000             // 30 s

// ─── Groq API types ───────────────────────────────────────────────────────────

interface GroqAnalysisResult {
  riskLevel: RiskLevel
  summary:   string
}

// ─── Helper: extract plain text from a PDF File object ───────────────────────

async function extractPdfText(file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)
  const data     = await pdfParse(buffer)
  return (data.text ?? '').slice(0, 6000) // match n8n workflow limit
}

// ─── Helper: call Groq directly (same model + prompt as n8n workflow) ─────────

async function callGroqDirect(text: string, signal: AbortSignal): Promise<GroqAnalysisResult> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) {
    throw new Error('GROQ_API_KEY is not configured.')
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: {
      'Content-Type':  'application/json',
      'Authorization': `Bearer ${groqKey}`,
    },
    body: JSON.stringify({
      model: 'allam-2-7b',
      messages: [
        {
          role:    'system',
          content:
            'You are a legal contract risk analyzer. Respond ONLY with a valid raw JSON object ' +
            '(no markdown, no backticks) containing exactly two keys: ' +
            '"riskLevel" (must be "Low", "Medium", or "High") and ' +
            '"summary" (a concise 2-3 sentence risk analysis).',
        },
        {
          role:    'user',
          content: `Analyze this document:\n\n${text}`,
        },
      ],
    }),
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`Groq API error ${res.status}: ${errText}`)
  }

  const json = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
  const raw  = json?.choices?.[0]?.message?.content ?? ''

  // Parse the JSON that Groq returns (same as n8n's Respond to Webhook node reads it)
  const parsed = JSON.parse(raw) as { riskLevel?: string; summary?: string }
  const riskLevel = (['High', 'Medium', 'Low'] as const).find(
    (r) => r.toLowerCase() === parsed.riskLevel?.toLowerCase()
  ) ?? 'Pending'

  return { riskLevel, summary: parsed.summary ?? '' }
}

// ─── Helper: try n8n webhook, return null on any failure ─────────────────────

async function tryN8nWebhook(
  file: File,
  webhookUrl: string,
  signal:     AbortSignal,
): Promise<GroqAnalysisResult | null> {
  try {
    const outForm = new FormData()
    outForm.append('file', file, file.name)

    const headers: HeadersInit = {}
    if (process.env.N8N_WEBHOOK_SECRET) {
      headers['Authorization'] = `Bearer ${process.env.N8N_WEBHOOK_SECRET}`
    }

    const n8nRes = await fetch(webhookUrl, { method: 'POST', headers, body: outForm, signal })

    if (!n8nRes.ok) {
      console.warn(`[ContractGuard] n8n returned ${n8nRes.status} — will fall back to direct Groq.`)
      return null
    }

    // n8n's "Respond to Webhook" node sends raw JSON text from the LLM
    const text = await n8nRes.text()
    const parsed = JSON.parse(text) as { riskLevel?: string; summary?: string }
    const riskLevel = (['High', 'Medium', 'Low'] as const).find(
      (r) => r.toLowerCase() === parsed.riskLevel?.toLowerCase()
    ) ?? 'Pending'

    return { riskLevel, summary: parsed.summary ?? '' }
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err  // propagate timeout
    console.warn('[ContractGuard] n8n unreachable — will fall back to direct Groq.', err)
    return null
  }
}

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

  // 5. Shared abort controller (covers both n8n and fallback Groq call) ───────
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    let result: GroqAnalysisResult | null = null

    // 6a. Try n8n webhook first (if configured) ───────────────────────────────
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (webhookUrl) {
      result = await tryN8nWebhook(file, webhookUrl, controller.signal)
    } else {
      console.info('[ContractGuard] N8N_WEBHOOK_URL not set — using direct Groq fallback.')
    }

    // 6b. Fall back to direct Groq call if n8n is unavailable or unconfigured ─
    if (!result) {
      console.info('[ContractGuard] Falling back to direct Groq API call.')
      const pdfText = await extractPdfText(file)
      result        = await callGroqDirect(pdfText, controller.signal)
    }

    clearTimeout(timeout)

    // 7. Return unified success response ──────────────────────────────────────
    return Response.json({
      success: true,
      data: {
        contractId: crypto.randomUUID(),
        riskLevel:  result.riskLevel,
        summary:    result.summary,
      },
    } satisfies AnalyzeResponse)

  } catch (err) {
    clearTimeout(timeout)

    if ((err as Error).name === 'AbortError') {
      return Response.json(
        { success: false, error: 'Analysis timed out after 30 s. Please try again.' } satisfies AnalyzeResponse,
        { status: 504 }
      )
    }

    console.error('[ContractGuard] Analysis failed:', err)
    return Response.json(
      { success: false, error: (err as Error).message || 'Analysis failed. Please try again.' } satisfies AnalyzeResponse,
      { status: 502 }
    )
  }
}
