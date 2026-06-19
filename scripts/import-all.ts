/**
 * Imports real data from the "Transaction Sheet 2026" workbook into the
 * Listing, Referral, Reimbursement and AgentContract tables.
 *
 * Usage: tsx scripts/import-all.ts ["path/to/workbook.xlsx"]
 */
import * as path from 'path'
import * as XLSX from 'xlsx'
import { PrismaClient } from '@prisma/client'
import {
  buildColumnMap,
  parseRow,
  type EntityConfig,
  type FieldMeta,
  LISTING_CONFIG,
  REFERRAL_CONFIG,
  REIMBURSEMENT_CONFIG,
  AGENT_CONTRACT_CONFIG,
} from '../lib/entities'

const prisma = new PrismaClient()
const DEFAULT_FILE = 'Transaction Sheet 2026 (1).xlsx'

interface Job {
  label: string
  sheets: string[]
  config: EntityConfig
  // Row is kept only if at least one of these fields has a value.
  requireAny: string[]
  insert: (records: Record<string, unknown>[]) => Promise<number>
  clear: () => Promise<unknown>
  count: () => Promise<number>
}

function findHeaderRow(rows: unknown[][], config: EntityConfig): number {
  let best = -1
  let bestScore = 0
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const map = buildColumnMap(rows[i] || [], config)
    const score = Object.keys(map).length
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return bestScore >= 3 ? best : -1
}

function collect(
  wb: XLSX.WorkBook,
  job: Job
): Record<string, unknown>[] {
  const out: Record<string, unknown>[] = []
  for (const sheetName of job.sheets) {
    const ws = wb.Sheets[sheetName]
    if (!ws) {
      console.warn(`  ! Sheet "${sheetName}" not found, skipping`)
      continue
    }
    const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, {
      header: 1,
      raw: true,
      blankrows: false,
    })
    const headerRow = findHeaderRow(rows, job.config)
    if (headerRow < 0) {
      console.warn(`  ! No header row found in "${sheetName}", skipping`)
      continue
    }
    const colMap: Record<number, FieldMeta> = buildColumnMap(rows[headerRow], job.config)
    let count = 0
    for (let r = headerRow + 1; r < rows.length; r++) {
      const rec = parseRow(rows[r] || [], colMap)
      if (!job.requireAny.some((k) => rec[k])) continue
      out.push(rec)
      count++
    }
    console.log(`  ${sheetName}: ${count} rows`)
  }
  return out
}

async function main() {
  const fileArg = process.argv[2] || DEFAULT_FILE
  const filePath = path.resolve(process.cwd(), fileArg)
  console.log(`Reading workbook: ${filePath}\n`)
  const wb = XLSX.readFile(filePath, { cellDates: true })

  const jobs: Job[] = [
    {
      label: 'Listings',
      sheets: ['Listing Board 2026', 'Closed  Canc  Exp 2026'],
      config: LISTING_CONFIG,
      requireAny: ['address', 'listingAgent', 'clientLegalName'],
      clear: () => prisma.listing.deleteMany({}),
      insert: async (records) => {
        // Default ACTIVE when status was blank (non-nullable column).
        for (const rec of records) if (!rec.status) rec.status = 'ACTIVE'
        const res = await prisma.listing.createMany({ data: records as never })
        return res.count
      },
      count: () => prisma.listing.count(),
    },
    {
      label: 'Referrals',
      sheets: ['Referrals'],
      config: REFERRAL_CONFIG,
      requireAny: ['agentName', 'recipientAgent', 'principal', 'propertyAddress'],
      clear: () => prisma.referral.deleteMany({}),
      insert: async (records) => {
        const res = await prisma.referral.createMany({ data: records as never })
        return res.count
      },
      count: () => prisma.referral.count(),
    },
    {
      label: 'Reimbursements',
      sheets: ['Agent Reimbursements'],
      config: REIMBURSEMENT_CONFIG,
      requireAny: ['agent', 'item', 'listing'],
      clear: () => prisma.reimbursement.deleteMany({}),
      insert: async (records) => {
        const res = await prisma.reimbursement.createMany({ data: records as never })
        return res.count
      },
      count: () => prisma.reimbursement.count(),
    },
    {
      label: 'Agent Contracts',
      sheets: ['Agent Contracts'],
      config: AGENT_CONTRACT_CONFIG,
      requireAny: ['agentName'],
      clear: () => prisma.agentContract.deleteMany({}),
      insert: async (records) => {
        const res = await prisma.agentContract.createMany({ data: records as never })
        return res.count
      },
      count: () => prisma.agentContract.count(),
    },
  ]

  for (const job of jobs) {
    console.log(`=== ${job.label} ===`)
    const records = collect(wb, job)
    await job.clear()
    const inserted = await job.insert(records)
    const total = await job.count()
    console.log(`  -> inserted ${inserted}, table total ${total}\n`)
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
