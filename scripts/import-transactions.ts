/**
 * Imports real transaction data from the "Transaction Sheet 2026" workbook
 * into the Transaction table.
 *
 * Sheets imported:
 *   - "Pending 2026"   -> status PENDING
 *   - "Closed 2026"    -> status CLOSED
 *   - "Cancelled 2026" -> status CANCELLED
 *
 * Usage: tsx scripts/import-transactions.ts ["path/to/workbook.xlsx"]
 */
import * as path from 'path'
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DEFAULT_FILE = 'Transaction Sheet 2026 (1).xlsx'

// Map of normalized header text -> Transaction field name.
const HEADER_MAP: Record<string, string> = {
  'coe month': 'coeMonth',
  'buyer, seller': 'side',
  'property address': 'propertyAddress',
  city: 'city',
  state: 'state',
  'zip code': 'zipCode',
  county: 'county',
  'agent name': 'agentName',
  'agent phone': 'agentPhone',
  'agent email': 'agentEmail',
  pm: 'pm',
  isa: 'isa',
  tc: 'tc',
  'tc email': 'tcEmail',
  'client name': 'clientName',
  'client phone numbers': 'clientPhone',
  email: 'clientEmail',
  'client email': 'clientEmail',
  'escrow/new build contact': 'escrowContact',
  'escrow phone': 'escrowPhone',
  'escrow email': 'escrowEmail',
  lender: 'lender',
  'lender phone': 'lenderPhone',
  'lender email': 'lenderEmail',
  'home warranty': 'homeWarranty',
  nhd: 'nhd',
  title: 'title',
  'other agent name (non-cht)': 'otherAgentName',
  'other agent contact (non-cht)': 'otherAgentContact',
  'quarter accepted': 'quarterAccepted',
  'acceptance date': 'acceptanceDate',
  'contract coe': 'contractCoe',
  'closing date': 'closingDate',
  'quarter closed': 'quarterClosed',
  solar: 'solar',
  hoa: 'hoa',
  septic: 'septic',
  termite: 'termite',
  'is this contingent to sale/purchase': 'contingent',
  notes: 'notes',
  uploads: 'uploads',
  'lead source': 'leadSource',
  'purchase price $': 'purchasePrice',
  'purchase price': 'purchasePrice',
  'commission %': 'commissionPct',
  'gci $': 'gci',
  'transaction fee': 'transactionFee',
  'tc fee': 'tcFee',
  'admin fee': 'adminFee',
  'listing add-on': 'listingAddOn',
  'agent fee collected': 'agentFeeCollected',
  'additional collected': 'additionalCollected',
  'additional deduction': 'additionalDeduction',
  'referral amt': 'referralAmt',
  'seller advance': 'sellerAdvance',
  'commission type': 'commissionType',
  'gross total': 'grossTotal',
  'team total': 'teamTotal',
  'agent estimate': 'agentEstimate',
  'va:boomtown/fub update': 'vaUpdate',
  'zillow-past sale': 'zillowPastSale',
  'review action plan sent': 'reviewActionPlanSent',
  'client status': 'clientStatus',
  'date of cancellation': 'dateOfCancellation',
  'cancelled by': 'cancelledBy',
  'reason for cancellation': 'reasonForCancellation',
}

const NUMBER_FIELDS = new Set([
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
])

const DATE_FIELDS = new Set([
  'acceptanceDate',
  'contractCoe',
  'closingDate',
  'dateOfCancellation',
])

interface SheetConfig {
  name: string
  status: 'PENDING' | 'CLOSED' | 'CANCELLED'
}

const SHEETS: SheetConfig[] = [
  { name: 'Pending 2026', status: 'PENDING' },
  { name: 'Closed 2026', status: 'CLOSED' },
  { name: 'Cancelled 2026', status: 'CANCELLED' },
]

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function excelSerialToDate(serial: number): Date {
  // Excel epoch is 1899-12-30; 25569 days between that and Unix epoch.
  return new Date(Math.round((serial - 25569) * 86400 * 1000))
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  if (typeof value === 'number') return excelSerialToDate(value)
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? null : d
}

function toStr(value: unknown): string | null {
  if (value === null || value === undefined) return null
  const s = String(value).trim()
  return s === '' ? null : s
}

// Finds the header row (the row containing the most known header labels).
function findHeaderRow(rows: unknown[][]): number {
  let best = -1
  let bestScore = 0
  const limit = Math.min(rows.length, 6)
  for (let i = 0; i < limit; i++) {
    const row = rows[i] || []
    let score = 0
    for (const cell of row) {
      if (HEADER_MAP[normalizeHeader(cell)]) score++
    }
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

async function main() {
  const fileArg = process.argv[2] || DEFAULT_FILE
  const filePath = path.resolve(process.cwd(), fileArg)
  console.log(`Reading workbook: ${filePath}`)

  const wb = XLSX.readFile(filePath, { cellDates: true })

  const records: Record<string, unknown>[] = []

  for (const cfg of SHEETS) {
    const ws = wb.Sheets[cfg.name]
    if (!ws) {
      console.warn(`  ! Sheet "${cfg.name}" not found, skipping`)
      continue
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      blankrows: false,
    })

    const headerRow = findHeaderRow(rows)
    if (headerRow < 0) {
      console.warn(`  ! No header row found in "${cfg.name}", skipping`)
      continue
    }

    // Build column index -> field map.
    const colToField: Record<number, string> = {}
    const headers = rows[headerRow]
    headers.forEach((h, idx) => {
      const field = HEADER_MAP[normalizeHeader(h)]
      // Don't overwrite an already-mapped field (e.g. duplicate "email").
      if (field && !Object.values(colToField).includes(field)) {
        colToField[idx] = field
      }
    })

    let count = 0
    for (let r = headerRow + 1; r < rows.length; r++) {
      const row = rows[r] || []
      const rec: Record<string, unknown> = { status: cfg.status }
      for (const [idxStr, field] of Object.entries(colToField)) {
        const raw = row[Number(idxStr)]
        if (NUMBER_FIELDS.has(field)) rec[field] = toNumber(raw)
        else if (DATE_FIELDS.has(field)) rec[field] = toDate(raw)
        else rec[field] = toStr(raw)
      }
      // Skip rows with no meaningful identifying data.
      if (!rec.propertyAddress && !rec.clientName && !rec.agentName) continue
      records.push(rec)
      count++
    }
    console.log(`  ${cfg.name} -> ${cfg.status}: ${count} rows`)
  }

  console.log(`\nClearing existing transactions...`)
  await prisma.transaction.deleteMany({})

  console.log(`Inserting ${records.length} transactions...`)
  // createMany is efficient and supported by PostgreSQL.
  const result = await prisma.transaction.createMany({
    data: records as never,
  })
  console.log(`Inserted ${result.count} transactions.`)

  const byStatus = await prisma.transaction.groupBy({
    by: ['status'],
    _count: true,
  })
  console.log('\nFinal counts:')
  for (const g of byStatus) {
    console.log(`  ${g.status}: ${g._count}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
