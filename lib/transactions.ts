// Shared field definitions + input sanitization for the Transaction model.

export const TRANSACTION_STATUSES = ['PENDING', 'CLOSED', 'CANCELLED'] as const
export type TransactionStatusValue = (typeof TRANSACTION_STATUSES)[number]

// Fields that should be parsed as numbers (Float in Prisma).
export const TRANSACTION_NUMBER_FIELDS = [
  'purchasePrice',
  'commissionPct',
  'gci',
  'transactionFee',
  'tcFee',
  'adminFee',
  'listingAddOn',
  'agentFeeCollected',
  'additionalCollected',
  'additionalDeduction',
  'referralAmt',
  'sellerAdvance',
  'grossTotal',
  'teamTotal',
  'agentEstimate',
] as const

// Fields that should be parsed as dates (DateTime in Prisma).
export const TRANSACTION_DATE_FIELDS = [
  'acceptanceDate',
  'contractCoe',
  'closingDate',
  'dateOfCancellation',
] as const

// Plain string fields.
export const TRANSACTION_STRING_FIELDS = [
  'coeMonth',
  'side',
  'propertyAddress',
  'city',
  'state',
  'zipCode',
  'county',
  'agentName',
  'agentPhone',
  'agentEmail',
  'pm',
  'isa',
  'tc',
  'tcEmail',
  'clientName',
  'clientPhone',
  'clientEmail',
  'otherAgentName',
  'otherAgentContact',
  'escrowContact',
  'escrowPhone',
  'escrowEmail',
  'lender',
  'lenderPhone',
  'lenderEmail',
  'homeWarranty',
  'nhd',
  'title',
  'quarterAccepted',
  'quarterClosed',
  'solar',
  'hoa',
  'septic',
  'termite',
  'contingent',
  'notes',
  'uploads',
  'leadSource',
  'commissionType',
  'vaUpdate',
  'zillowPastSale',
  'reviewActionPlanSent',
  'clientStatus',
  'cancelledBy',
  'reasonForCancellation',
] as const

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function toDateOrNull(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

// Builds a Prisma-safe data object from an arbitrary request body, only
// picking known fields and coercing them to their proper types.
export function sanitizeTransactionInput(
  body: Record<string, unknown>
): Record<string, unknown> {
  const data: Record<string, unknown> = {}

  if (typeof body.status === 'string') {
    const status = body.status.toUpperCase()
    if ((TRANSACTION_STATUSES as readonly string[]).includes(status)) {
      data.status = status
    }
  }

  for (const field of TRANSACTION_NUMBER_FIELDS) {
    if (field in body) data[field] = toNumberOrNull(body[field])
  }
  for (const field of TRANSACTION_DATE_FIELDS) {
    if (field in body) data[field] = toDateOrNull(body[field])
  }
  for (const field of TRANSACTION_STRING_FIELDS) {
    if (field in body) data[field] = toStringOrNull(body[field])
  }

  // Auto-compute GCI when price and commission% are present and GCI wasn't
  // explicitly provided.
  const price = toNumberOrNull(body.purchasePrice)
  const pct = toNumberOrNull(body.commissionPct)
  if (data.gci == null && price != null && pct != null) {
    data.gci = price * pct
  }

  return data
}
