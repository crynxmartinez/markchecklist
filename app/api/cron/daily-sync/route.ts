import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGHLContacts } from '@/lib/ghl'
import { Prisma } from '@prisma/client'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'

function toE164(phone?: string | null): string | undefined {
  if (!phone) return undefined
  const trimmed = phone.trim()
  if (trimmed.startsWith('+')) return trimmed.replace(/\s/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return undefined
}

async function upsertToGHL(
  apiKey: string,
  locationId: string,
  record: { id: string; name: string; email?: string | null; phone?: string | null },
  tag: string
): Promise<{ success: boolean; ghlId: string | null; error?: string }> {
  const e164Phone = toE164(record.phone)
  if (!record.email && !e164Phone) {
    return { success: false, ghlId: null, error: 'No email or phone' }
  }
  const [firstName, ...rest] = (record.name || '').trim().split(/\s+/)
  const payload: Record<string, unknown> = {
    locationId,
    firstName: firstName || undefined,
    lastName: rest.join(' ') || undefined,
    email: record.email || undefined,
    phone: e164Phone || undefined,
    tags: [tag],
    source: 'CHT System',
  }
  Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

  const res = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      Version: '2021-07-28',
    },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    const errText = await res.text()
    return { success: false, ghlId: null, error: `GHL ${res.status}: ${errText}` }
  }

  const data = await res.json()
  const ghlId = data.contact?.id ?? data.id ?? null
  if (!ghlId) return { success: false, ghlId: null, error: 'GHL returned no contact ID' }
  return { success: true, ghlId }
}

export async function GET(request: Request) {
  // Verify this is called by Vercel Cron (or an authorized internal call)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const apiKey = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!apiKey || !locationId) {
    return NextResponse.json({ error: 'GHL credentials not configured' }, { status: 500 })
  }

  const log: string[] = []
  const startedAt = new Date().toISOString()
  log.push(`[${startedAt}] Daily sync started`)

  // ── 1. Sync contacts from GHL ──────────────────────────────────────────────
  try {
    log.push('Step 1: Syncing contacts from GHL...')
    const ghlContacts = await fetchGHLContacts(locationId, apiKey)
    let created = 0, updated = 0, errors = 0
    for (const contact of ghlContacts) {
      try {
        const existing = await prisma.contact.findUnique({
          where: { ghlContactId: contact.id },
          select: { id: true },
        })
        await prisma.contact.upsert({
          where: { ghlContactId: contact.id },
          update: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            tags: contact.tags || [],
            source: contact.source,
            lastUpdated: contact.dateUpdated ? new Date(contact.dateUpdated) : null,
            customFields: contact.customFields || Prisma.JsonNull,
          },
          create: {
            ghlContactId: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            tags: contact.tags || [],
            source: contact.source,
            subAccount: 'Cory Home Team Agent Recruiter',
            dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
            lastUpdated: contact.dateUpdated ? new Date(contact.dateUpdated) : null,
            customFields: contact.customFields || Prisma.JsonNull,
          },
        })
        if (existing) updated++; else created++
      } catch {
        errors++
      }
    }
    log.push(`  → ${ghlContacts.length} total | ${created} created | ${updated} updated | ${errors} errors`)
  } catch (err) {
    log.push(`  ✗ Contact sync failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── 2. Push all agents to GHL ──────────────────────────────────────────────
  try {
    log.push('Step 2: Pushing agents to GHL...')
    const agents = await prisma.agent.findMany({
      select: { id: true, name: true, email: true, phone: true },
    })
    let agentSuccess = 0, agentFailed = 0
    for (const agent of agents) {
      const result = await upsertToGHL(apiKey, locationId, agent, 'CHT Agent')
      if (result.success && result.ghlId) {
        await prisma.agent.update({ where: { id: agent.id }, data: { ghlContactId: result.ghlId } })
        agentSuccess++
      } else {
        agentFailed++
        log.push(`  ✗ Agent ${agent.name}: ${result.error}`)
      }
    }
    log.push(`  → ${agents.length} total | ${agentSuccess} pushed | ${agentFailed} failed`)
  } catch (err) {
    log.push(`  ✗ Agent push failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  // ── 3. Push all admins to GHL ──────────────────────────────────────────────
  try {
    log.push('Step 3: Pushing admins to GHL...')
    const admins = await prisma.admin.findMany({
      select: { id: true, name: true, email: true, phone: true },
    })
    let adminSuccess = 0, adminFailed = 0
    for (const admin of admins) {
      const result = await upsertToGHL(apiKey, locationId, admin, 'CHT Admin')
      if (result.success && result.ghlId) {
        await prisma.admin.update({ where: { id: admin.id }, data: { ghlContactId: result.ghlId } })
        adminSuccess++
      } else {
        adminFailed++
        log.push(`  ✗ Admin ${admin.name}: ${result.error}`)
      }
    }
    log.push(`  → ${admins.length} total | ${adminSuccess} pushed | ${adminFailed} failed`)
  } catch (err) {
    log.push(`  ✗ Admin push failed: ${err instanceof Error ? err.message : String(err)}`)
  }

  const finishedAt = new Date().toISOString()
  log.push(`[${finishedAt}] Daily sync complete`)
  console.log(log.join('\n'))

  return NextResponse.json({ success: true, log })
}
