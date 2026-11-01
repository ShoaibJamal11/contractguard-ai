/**
 * ⚠️  MOCK DATA — for UI development and demo purposes only.
 *
 * These rows are hard-coded sample data and do NOT represent real contracts,
 * real companies, or real AI analysis results. Replace this with a live
 * database query (e.g. Supabase) before going to production.
 */

import type { Contract } from '@/types/contract'

export const MOCK_CONTRACTS: Contract[] = [
  {
    id: 'mock-001',
    name: 'Master Service Agreement — Apex Technologies Inc.',
    uploadedAt: '2026-10-26T09:15:00Z',
    status: 'Analyzed',
    riskLevel: 'High',
    fileSize: '3.2 MB',
    summary:
      'This MSA contains several high-risk clauses: (1) unlimited liability exposure in Section 8.2, (2) an overly broad indemnification clause covering third-party IP claims without a cap, (3) automatic renewal with a 90-day cancellation window, and (4) a unilateral right for the vendor to modify SLA terms. Recommend renegotiating Sections 8.2 and 12.1 before execution.',
  },
  {
    id: 'mock-002',
    name: 'Non-Disclosure Agreement — Blue Horizon Fund',
    uploadedAt: '2026-10-25T14:22:00Z',
    status: 'Analyzed',
    riskLevel: 'Low',
    fileSize: '0.9 MB',
    summary:
      'Standard mutual NDA with a 2-year confidentiality period. No unusual restrictions on residual knowledge. Jurisdiction is Delaware, which aligns with company policy. No flagged clauses.',
  },
  {
    id: 'mock-003',
    name: 'SaaS Subscription Agreement — Nova Dynamics',
    uploadedAt: '2026-10-24T11:05:00Z',
    status: 'Analyzed',
    riskLevel: 'Medium',
    fileSize: '2.1 MB',
    summary:
      'The SaaS agreement includes a 99.5% uptime SLA (below the recommended 99.9%). Data processing addendum references GDPR compliance but lacks explicit sub-processor notification obligations. Pricing escalation clause in Section 6.3 allows up to 15% annual increases. Consider negotiating an uptime improvement and a price-increase cap.',
  },
  {
    id: 'mock-004',
    name: 'Employment Contract — Engineering Division',
    uploadedAt: '2026-10-23T16:40:00Z',
    status: 'Analyzed',
    riskLevel: 'Low',
    fileSize: '1.4 MB',
    summary:
      'Standard at-will employment agreement. Non-compete clause is limited to 12 months and a 50-mile radius, which is enforceable in most jurisdictions. IP assignment clause is clear and comprehensive. No flagged issues.',
  },
  {
    id: 'mock-005',
    name: 'Vendor Framework Agreement — Cascade Systems Ltd.',
    uploadedAt: '2026-10-22T08:55:00Z',
    status: 'Analyzed',
    riskLevel: 'High',
    fileSize: '4.7 MB',
    summary:
      'Critical issues identified: (1) Force majeure clause is overly narrow and excludes pandemic-related events, (2) payment terms of Net-15 are aggressive, (3) intellectual property ownership of derivative works is ambiguous in Section 9, and (4) termination for convenience requires 180-day notice. Strongly recommend legal review before signing.',
  },
  {
    id: 'mock-006',
    name: 'IP Assignment Agreement — DataPath Corp.',
    uploadedAt: '2026-10-21T13:30:00Z',
    status: 'Analyzed',
    riskLevel: 'Medium',
    fileSize: '2.8 MB',
    summary:
      'IP assignment covers all work product created during engagement. However, the definition of "prior inventions" is vague and could lead to disputes. The moral rights waiver may not be enforceable in EU jurisdictions. Recommend adding a scheduled exhibit for pre-existing IP.',
  },
  {
    id: 'mock-007',
    name: 'Joint Venture Agreement — Quantum Ventures',
    uploadedAt: '2026-10-20T10:00:00Z',
    status: 'Analyzing',
    riskLevel: 'Pending',
    fileSize: '5.3 MB',
  },
  {
    id: 'mock-008',
    name: 'Commercial Lease — 500 Market St. Office Space',
    uploadedAt: '2026-10-19T15:20:00Z',
    status: 'Analyzed',
    riskLevel: 'Medium',
    fileSize: '1.8 MB',
    summary:
      'The lease includes a standard triple-net structure. Escalation clause ties rent increases to CPI + 2%, which is above market. The personal guarantee requirement in Section 14 should be removed for a corporate tenant. Early termination penalty of 6 months\' rent is negotiable.',
  },
]
