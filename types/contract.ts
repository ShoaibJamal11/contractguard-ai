// ─── Shared domain types ────────────────────────────────────────────────────

export type RiskLevel = 'High' | 'Medium' | 'Low' | 'Pending'

export type ContractStatus = 'Analyzed' | 'Analyzing' | 'Failed'

export interface Contract {
  id: string
  /** Display name derived from the file name (PDF extension stripped). */
  name: string
  /** ISO 8601 timestamp of when the file was received. */
  uploadedAt: string
  status: ContractStatus
  riskLevel: RiskLevel
  /** Human-readable file size, e.g. "2.4 MB". */
  fileSize?: string
  /** AI-generated risk summary returned by the analysis API. */
  summary?: string
}

// ─── API response types ──────────────────────────────────────────────────────

export interface AnalyzeResponseData {
  contractId: string
  riskLevel: RiskLevel
  /** Optional short summary from the AI model (may be empty in mocked mode). */
  summary?: string
}

export interface AnalyzeResponse {
  success: boolean
  data?: AnalyzeResponseData
  error?: string
}

