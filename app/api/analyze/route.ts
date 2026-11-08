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

// ─── Utility: safe JSON parse that never throws ───────────────────────────────
// Strips markdown code fences (```json ... ```) that LLMs sometimes prepend.

function safeJsonParse(raw: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null

  // Strip markdown code fences if present
  const stripped = raw
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  if (!stripped) return null

  try {
    const parsed = JSON.parse(stripped)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>
    }
    return null
  } catch {
    // Try to extract a JSON object substring as a last resort
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) {
      try {
        return JSON.parse(match[0]) as Record<string, unknown>
      } catch {
        return null
      }
    }
    return null
  }
}

// ─── Utility: read a Response body as text, never throw ──────────────────────

async function safeReadText(res: Response): Promise<string> {
  try {
    return await res.text()
  } catch {
    return ''
  }
}

// ─── Utility: normalise raw LLM JSON object → GroqAnalysisResult ─────────────

function normaliseAnalysis(obj: Record<string, unknown>): GroqAnalysisResult {
  const rawLevel = typeof obj.riskLevel === 'string' ? obj.riskLevel : ''
  const riskLevel = (['High', 'Medium', 'Low'] as const).find(
    (r) => r.toLowerCase() === rawLevel.toLowerCase()
  ) ?? 'Pending'

  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : 'No summary was returned by the analysis model.'

  return { riskLevel, summary }
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
    throw new Error('GROQ_API_KEY is not configured. Add it to .env.local to enable direct analysis.')
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

  const bodyText = await safeReadText(res)

  if (!res.ok) {
    console.error(`[ContractGuard] Groq API error ${res.status}:`, bodyText)
    throw new Error(`Groq API returned ${res.status}. Check your GROQ_API_KEY.`)
  }

  // Parse the outer Groq response envelope
  const envelope = safeJsonParse(bodyText)
  if (!envelope) {
    console.error('[ContractGuard] Groq returned an unparseable body:', bodyText)
    throw new Error('Groq returned an unexpected response format.')
  }

  // Extract the LLM message content
  const choices  = Array.isArray(envelope.choices) ? envelope.choices : []
  const content  = (choices[0] as { message?: { content?: string } })?.message?.content ?? ''

  if (!content) {
    console.warn('[ContractGuard] Groq choices[0].message.content was empty.')
    return { riskLevel: 'Pending', summary: 'The analysis model returned an empty response.' }
  }

  // Parse the inner JSON that the LLM produced
  const parsed = safeJsonParse(content)
  if (!parsed) {
    console.warn('[ContractGuard] Could not parse LLM JSON content:', content)
    // Return a graceful fallback rather than crashing
    return {
      riskLevel: 'Pending',
      summary:   `Analysis model responded with non-JSON content: "${content.slice(0, 200)}"`,
    }
  }

  return normaliseAnalysis(parsed)
}

// ─── Helper: try n8n webhook, return null on any failure ─────────────────────

async function tryN8nWebhook(
  file:       File,
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
    const bodyText = await safeReadText(n8nRes)

    if (!n8nRes.ok) {
      console.warn(`[ContractGuard] n8n returned ${n8nRes.status} — will fall back to direct Groq.`)
      return null
    }

    if (!bodyText.trim()) {
      console.warn('[ContractGuard] n8n returned an empty body — will fall back to direct Groq.')
      return null
    }

    // n8n's "Respond to Webhook" node sends the raw LLM JSON text
    const parsed = safeJsonParse(bodyText)
    if (!parsed) {
      console.warn('[ContractGuard] Could not parse n8n response body:', bodyText.slice(0, 300))
      return null
    }

    return normaliseAnalysis(parsed)
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err  // propagate timeout
    console.warn('[ContractGuard] n8n unreachable — will fall back to direct Groq.', (err as Error).message)
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

    const message = (err as Error).message || 'Analysis failed. Please try again.'
    console.error('[ContractGuard] Analysis pipeline failed:', message)
    return Response.json(
      { success: false, error: message } satisfies AnalyzeResponse,
      { status: 502 }
    )
  }
}
