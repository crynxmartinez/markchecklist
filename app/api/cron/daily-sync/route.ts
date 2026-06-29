import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { fetchGHLContacts, ensureGHLContact } from '@/lib/ghl'
import { Prisma } from '@prisma/client'

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
      select: { id: true, name: true, email: true, phone: true, ghlContactId: true },
    })
    let agentSuccess = 0, agentFailed = 0
    for (const agent of agents) {
      if (!agent.email && !agent.phone) { agentFailed++; log.push(`  ✗ Agent ${agent.name}: No email or phone`); continue }
      try {
        const [firstName, ...rest] = (agent.name || '').trim().split(/\s+/)
        const { ghlId } = await ensureGHLContact({
          ghlContactId: agent.ghlContactId,
          firstName: firstName || undefined,
          lastName: rest.join(' ') || undefined,
          email: agent.email,
          phone: agent.phone,
          tags: ['CHT Agent'],
          source: 'CHT System',
          locationId,
          apiKey,
        })
        await prisma.agent.update({ where: { id: agent.id }, data: { ghlContactId: ghlId } })
        agentSuccess++
      } catch (err) {
        agentFailed++
        log.push(`  ✗ Agent ${agent.name}: ${err instanceof Error ? err.message : String(err)}`)
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
      select: { id: true, name: true, email: true, phone: true, ghlContactId: true },
    })
    let adminSuccess = 0, adminFailed = 0
    for (const admin of admins) {
      if (!admin.email && !admin.phone) { adminFailed++; log.push(`  ✗ Admin ${admin.name}: No email or phone`); continue }
      try {
        const [firstName, ...rest] = (admin.name || '').trim().split(/\s+/)
        const { ghlId } = await ensureGHLContact({
          ghlContactId: admin.ghlContactId,
          firstName: firstName || undefined,
          lastName: rest.join(' ') || undefined,
          email: admin.email,
          phone: admin.phone,
          tags: ['CHT Admin'],
          source: 'CHT System',
          locationId,
          apiKey,
        })
        await prisma.admin.update({ where: { id: admin.id }, data: { ghlContactId: ghlId } })
        adminSuccess++
      } catch (err) {
        adminFailed++
        log.push(`  ✗ Admin ${admin.name}: ${err instanceof Error ? err.message : String(err)}`)
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
