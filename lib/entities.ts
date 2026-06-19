// Centralized field metadata for the spreadsheet-backed entities.
// Used by both the API route sanitizers and the Excel importer so column
// mappings and type coercion stay in one place.

export type FieldType = 'string' | 'number' | 'date' | 'enum'

export interface FieldMeta {
  key: string
  type: FieldType
  // Normalized header labels (lowercase, single-spaced) that map to this field.
  headers: string[]
  enumValues?: string[]
}

export interface EntityConfig {
  fields: FieldMeta[]
}

export function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function excelSerialToDate(serial: number): Date {
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

export function coerceValue(value: unknown, type: FieldType, enumValues?: string[]): unknown {
  if (type === 'number') {
    if (value === null || value === undefined || value === '') return null
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    return Number.isFinite(n) ? n : null
  }
  if (type === 'date') {
    if (value === null || value === undefined || value === '') return null
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
    if (typeof value === 'number') return excelSerialToDate(value)
    const d = new Date(String(value))
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (type === 'enum') {
    if (value === null || value === undefined) return null
    const s = String(value).trim().toUpperCase()
    return enumValues && enumValues.includes(s) ? s : null
  }
  // string
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

// Builds a Prisma-safe data object from an arbitrary request body.
export function sanitizeBody(
  body: Record<string, unknown>,
  config: EntityConfig
): Record<string, unknown> {
  const data: Record<string, unknown> = {}
  for (const field of config.fields) {
    if (field.key in body) {
      data[field.key] = coerceValue(body[field.key], field.type, field.enumValues)
    }
  }
  return data
}

// Maps a header row to { columnIndex: FieldMeta }.
export function buildColumnMap(
  headerRow: unknown[],
  config: EntityConfig
): Record<number, FieldMeta> {
  const byHeader: Record<string, FieldMeta> = {}
  for (const field of config.fields) {
    for (const h of field.headers) byHeader[h] = field
  }
  const map: Record<number, FieldMeta> = {}
  const usedKeys = new Set<string>()
  headerRow.forEach((cell, idx) => {
    const field = byHeader[normalizeHeader(cell)]
    if (field && !usedKeys.has(field.key)) {
      map[idx] = field
      usedKeys.add(field.key)
    }
  })
  return map
}

// Parses a data row into a coerced record using the column map.
export function parseRow(
  row: unknown[],
  colMap: Record<number, FieldMeta>
): Record<string, unknown> {
  const rec: Record<string, unknown> = {}
  for (const [idxStr, field] of Object.entries(colMap)) {
    rec[field.key] = coerceValue(row[Number(idxStr)], field.type, field.enumValues)
  }
  return rec
}

const LISTING_STATUS = ['ACTIVE', 'CLOSED', 'CANCELLED', 'EXPIRED']

export const LISTING_CONFIG: EntityConfig = {
  fields: [
    { key: 'status', type: 'enum', enumValues: LISTING_STATUS, headers: ['status'] },
    { key: 'listingServices', type: 'string', headers: ['listing services'] },
    { key: 'listingShowcase', type: 'string', headers: ['listing showcase yes / no'] },
    { key: 'listingAgent', type: 'string', headers: ['listing agent'] },
    { key: 'tc', type: 'string', headers: ['tc'] },
    { key: 'address', type: 'string', headers: ['address'] },
    { key: 'signUpDown', type: 'string', headers: ['sign up/down'] },
    { key: 'listingPrice', type: 'number', headers: ['listing price'] },
    { key: 'listingStartDate', type: 'date', headers: ['listing start date'] },
    { key: 'listingExpDate', type: 'date', headers: ['listing exp date'] },
    { key: 'takeSheetReceived', type: 'string', headers: ['take sheet received'] },
    { key: 'commission', type: 'number', headers: ['commission'] },
    { key: 'closingNotes', type: 'string', headers: ['closing notes'] },
    { key: 'sellerAdvance', type: 'number', headers: ['seller advance'] },
    { key: 'agentFee', type: 'string', headers: ['agent fee'] },
    { key: 'sellersHwOrder', type: 'string', headers: ['sellers hw order'] },
    { key: 'daysOffMarket', type: 'string', headers: ['days off market'] },
    { key: 'todaysDate', type: 'date', headers: ['todays date'] },
    { key: 'trustNameOrEntity', type: 'string', headers: ['trust name or entity'] },
    { key: 'clientLegalName', type: 'string', headers: ['clients legal name'] },
    { key: 'clientPhone', type: 'string', headers: ['clients phone'] },
    { key: 'clientEmail', type: 'string', headers: ['clients email'] },
    { key: 'reasonForCancellation', type: 'string', headers: ['reason for cancellation'] },
  ],
}

export const REFERRAL_CONFIG: EntityConfig = {
  fields: [
    { key: 'referralType', type: 'string', headers: ['referral type'] },
    { key: 'dealType', type: 'string', headers: ['type'] },
    { key: 'side', type: 'string', headers: ['seller, buyer'] },
    { key: 'propertyAddress', type: 'string', headers: ['property address'] },
    { key: 'city', type: 'string', headers: ['city'] },
    { key: 'zipCode', type: 'string', headers: ['zip code'] },
    { key: 'county', type: 'string', headers: ['county'] },
    { key: 'agentName', type: 'string', headers: ['agent name'] },
    { key: 'isa', type: 'string', headers: ['isa'] },
    { key: 'am', type: 'string', headers: ['am'] },
    { key: 'principal', type: 'string', headers: ['principal'] },
    { key: 'clientPhone', type: 'string', headers: ['client phone numbers'] },
    { key: 'clientEmail', type: 'string', headers: ['email addresses for client'] },
    { key: 'recipientAgent', type: 'string', headers: ['recipient agent'] },
    { key: 'recipientAgentBroker', type: 'string', headers: ['recipient agent broker'] },
    { key: 'rfaStatus', type: 'string', headers: ['rfa status'] },
    { key: 'acceptanceDate', type: 'date', headers: ['acceptance date'] },
    { key: 'contractClosedDate', type: 'date', headers: ['contract closed date'] },
    { key: 'actualClosingDate', type: 'date', headers: ['actual closing date'] },
    { key: 'leadSource', type: 'string', headers: ['lead source'] },
    { key: 'purchasePrice', type: 'number', headers: ['purchase price'] },
    { key: 'commission', type: 'string', headers: ['commission $ or %'] },
    { key: 'gci', type: 'number', headers: ['gci $'] },
    { key: 'referralAmount', type: 'number', headers: ['referral amount'] },
    { key: 'commissionType', type: 'string', headers: ['commission type'] },
    { key: 'grossTotal', type: 'number', headers: ['gross total'] },
    { key: 'teamTotal', type: 'number', headers: ['team total'] },
    { key: 'agentEstimate', type: 'number', headers: ['agent estimate'] },
    { key: 'commissionAdjustments', type: 'string', headers: ['commission adjustments'] },
    { key: 'agentCommission', type: 'number', headers: ['agent commission'] },
    { key: 'escrowDisbursement', type: 'number', headers: ['escrow disbursement'] },
  ],
}

export const REIMBURSEMENT_CONFIG: EntityConfig = {
  fields: [
    { key: 'agent', type: 'string', headers: ['agent'] },
    { key: 'listing', type: 'string', headers: ['listing'] },
    { key: 'item', type: 'string', headers: ['item'] },
    { key: 'amount', type: 'number', headers: ['reimbursement'] },
    { key: 'notes', type: 'string', headers: ['notes'] },
    { key: 'status', type: 'string', headers: ['status'] },
  ],
}

export const AGENT_CONTRACT_CONFIG: EntityConfig = {
  fields: [
    { key: 'agentName', type: 'string', headers: ['agent'] },
    { key: 'soi', type: 'number', headers: ['soi'] },
    { key: 'chtContractSent', type: 'date', headers: ['cht contract sent'] },
    { key: 'chtContractSigned', type: 'date', headers: ['cht contract signed'] },
    { key: 'chtContractEffective', type: 'date', headers: ['cht contract effective date'] },
    { key: 'anniversaryDate', type: 'date', headers: ['anniversary date'] },
    { key: 'dateToReviewSoiSplit', type: 'date', headers: ['date to review soi split'] },
    { key: 'expContractSigned', type: 'string', headers: ['exp contract signed'] },
    { key: 'dateOnboardingCompleted', type: 'date', headers: ['date onboarding completed'] },
    { key: 'soiCap', type: 'string', headers: ['soi cap'] },
    { key: 'referralAgent', type: 'string', headers: ['referral agent'] },
    { key: 'productionManager', type: 'string', headers: ['production manager'] },
    { key: 'dateAssignedToPm', type: 'string', headers: ['date assigned to pm'] },
    { key: 'eaProgramAssignedDate', type: 'string', headers: ['ea program assigned date'] },
    { key: 'transactionsPaidEa', type: 'string', headers: ['# of transactions paid (ea)'] },
    { key: 'tcServicesSubscribedDate', type: 'string', headers: ['tc services subscribed date'] },
    { key: 'fubAccount', type: 'string', headers: ['fub account'] },
    { key: 'disc', type: 'string', headers: ['disc'] },
    { key: 'adminBill', type: 'string', headers: ['admin bill (for reimbursement)'] },
    { key: 'source', type: 'string', headers: ['source'] },
    { key: 'zillowAccountabilityAgreement', type: 'string', headers: ['zillow accountability agreement'] },
    { key: 'payNotes', type: 'string', headers: ['pay notes'] },
  ],
}
