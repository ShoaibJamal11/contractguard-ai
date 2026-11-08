import { NextRequest } from 'next/server'
import type { AnalyzeResponse, RiskLevel } from '@/types/contract'

// NOTE: `export const runtime = 'nodejs'` is incompatible with cacheComponents
// in this Next.js build config — the route already runs on Node.js by default
// because serverExternalPackages is set in next.config.ts for pdf-parse.

// ─── Constants ────────────────────────────────────────────────────────────────

const MAX_BYTES  = 10 * 1024 * 1024   // 10 MB
const TIMEOUT_MS = 30_000             // 30 s

// ─── Fallback returned when EVERY analysis path fails ────────────────────────
// The UI shows "Analyzed" with a Pending badge and an explanatory summary
// instead of a Failed row or a broken 500 screen.

function buildFallbackResponse(reason: string): Response {
  console.warn('[ContractGuard] All analysis paths failed — returning soft fallback.', reason)
  return Response.json({
    success: true,
    data: {
      contractId: crypto.randomUUID(),
      riskLevel:  'Pending' as RiskLevel,
      summary:
        'Automated risk analysis could not be completed at this time. ' +
        `Reason: ${reason} ` +
        'Please configure N8N_WEBHOOK_URL or GROQ_API_KEY in .env.local and retry.',
    },
  } satisfies AnalyzeResponse)
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface GroqAnalysisResult {
  riskLevel: RiskLevel
  summary:   string
}

// ─── Utility: safe JSON parse — never throws ──────────────────────────────────
// Strips markdown code fences (```json ... ```) that LLMs sometimes prepend.

function safeJsonParse(raw: string): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'string') return null

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
    // Last resort: extract first {...} substring
    const match = stripped.match(/\{[\s\S]*\}/)
    if (match) {
      try { return JSON.parse(match[0]) as Record<string, unknown> } catch { /* fall through */ }
    }
    return null
  }
}

// ─── Utility: read a Response body as text — never throws ────────────────────

async function safeReadText(res: Response): Promise<string> {
  try { return await res.text() } catch { return '' }
}

// ─── Utility: normalise raw LLM object → GroqAnalysisResult ──────────────────

function normaliseAnalysis(obj: Record<string, unknown>): GroqAnalysisResult {
  const rawLevel  = typeof obj.riskLevel === 'string' ? obj.riskLevel : ''
  const riskLevel = (['High', 'Medium', 'Low'] as const).find(
    (r) => r.toLowerCase() === rawLevel.toLowerCase()
  ) ?? 'Pending'
  const summary =
    typeof obj.summary === 'string' && obj.summary.trim()
      ? obj.summary.trim()
      : 'No summary was returned by the analysis model.'
  return { riskLevel, summary }
}

// ─── Helper: extract plain text from a PDF File ───────────────────────────────
// Dynamic import keeps pdf-parse out of the Turbopack bundle graph entirely.

async function extractPdfText(file: File): Promise<string> {
  const arrayBuf = await file.arrayBuffer()
  const buffer   = Buffer.from(arrayBuf)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mod        = await import('pdf-parse') as any
  const pdfParse   = (mod.default ?? mod) as (buf: Buffer) => Promise<{ text: string }>
  const data       = await pdfParse(buffer)
  return (data?.text ?? '').slice(0, 6000)
}

// ─── Helper: call Groq API directly ──────────────────────────────────────────

async function callGroqDirect(text: string, signal: AbortSignal): Promise<GroqAnalysisResult> {
  const groqKey = process.env.GROQ_API_KEY
  if (!groqKey) throw new Error('GROQ_API_KEY is not configured.')

  const res      = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
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
        { role: 'user', content: `Analyze this document:\n\n${text}` },
      ],
    }),
  })

  const bodyText = await safeReadText(res)

  if (!res.ok) {
    console.error(`[ContractGuard] Groq API error ${res.status}:`, bodyText.slice(0, 300))
    throw new Error(`Groq API returned ${res.status}. Check your GROQ_API_KEY.`)
  }

  const envelope = safeJsonParse(bodyText)
  if (!envelope) throw new Error('Groq returned an unparseable response.')

  const choices = Array.isArray(envelope.choices) ? envelope.choices : []
  const content = (choices[0] as { message?: { content?: string } })?.message?.content ?? ''

  if (!content) {
    console.warn('[ContractGuard] Groq choices[0].message.content was empty.')
    return { riskLevel: 'Pending', summary: 'The analysis model returned an empty response.' }
  }

  const parsed = safeJsonParse(content)
  if (!parsed) {
    console.warn('[ContractGuard] Could not parse LLM JSON content:', content.slice(0, 300))
    return {
      riskLevel: 'Pending',
      summary:   `Model responded with non-JSON content: "${content.slice(0, 200)}"`,
    }
  }

  return normaliseAnalysis(parsed)
}

// ─── Helper: try n8n webhook — returns null on any failure ───────────────────

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

    const n8nRes   = await fetch(webhookUrl, { method: 'POST', headers, body: outForm, signal })
    const bodyText = await safeReadText(n8nRes)

    if (!n8nRes.ok) {
      console.warn(`[ContractGuard] n8n returned ${n8nRes.status} — will fall back to Groq.`)
      return null
    }
    if (!bodyText.trim()) {
      console.warn('[ContractGuard] n8n returned empty body — will fall back to Groq.')
      return null
    }

    const parsed = safeJsonParse(bodyText)
    if (!parsed) {
      console.warn('[ContractGuard] Could not parse n8n body:', bodyText.slice(0, 300))
      return null
    }

    return normaliseAnalysis(parsed)
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err  // propagate timeout
    console.warn('[ContractGuard] n8n unreachable — falling back to Groq.', (err as Error).message)
    return null
  }
}

// ─── POST /api/analyze ────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<Response> {
  // ── Outer safety net: catches any uncaught error and returns 200 fallback ──
  // This prevents HTTP 500 from ever reaching the client regardless of cause.
  try {
    return await handleAnalyze(request)
  } catch (err) {
    const error = err as Error
    console.error('[ContractGuard] UNHANDLED ERROR in POST /api/analyze')
    console.error('  message:', error.message)
    console.error('  stack:  ', error.stack)
    return buildFallbackResponse(error.message ?? 'Unexpected server error.')
  }
}

// ─── Inner handler (separated so the outer catch wraps everything) ────────────

async function handleAnalyze(request: NextRequest): Promise<Response> {

  // 1. Parse multipart/form-data ──────────────────────────────────────────────
  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    console.error('[ContractGuard] Failed to parse form data:', (err as Error).message)
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

  // 5. Shared abort controller ─────────────────────────────────────────────────
  const controller = new AbortController()
  const timeout    = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    let result: GroqAnalysisResult | null = null

    // 6a. Try n8n webhook first ───────────────────────────────────────────────
    const webhookUrl = process.env.N8N_WEBHOOK_URL
    if (webhookUrl) {
      result = await tryN8nWebhook(file, webhookUrl, controller.signal)
    } else {
      console.info('[ContractGuard] N8N_WEBHOOK_URL not set — using direct Groq fallback.')
    }

    // 6b. Fall back to direct Groq call ───────────────────────────────────────
    if (!result) {
      console.info('[ContractGuard] Falling back to direct Groq API call.')
      try {
        const pdfText = await extractPdfText(file)
        result        = await callGroqDirect(pdfText, controller.signal)
      } catch (groqErr) {
        // Groq also failed — build a 200 soft-fallback instead of a 500
        const reason = (groqErr as Error).message ?? 'Groq call failed.'
        console.error('[ContractGuard] Direct Groq call failed:', reason)
        clearTimeout(timeout)
        return buildFallbackResponse(reason)
      }
    }

    clearTimeout(timeout)

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
    console.error('[ContractGuard] Analysis pipeline error:', message)
    // Return 200 fallback instead of surfacing the error as a broken UI state
    return buildFallbackResponse(message)
  }
}
