import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID
    if (!apiKey || !locationId) {
      return NextResponse.json({ error: 'GHL credentials not configured' }, { status: 500 })
    }

    const { agentIds } = await request.json()
    if (!agentIds || !Array.isArray(agentIds) || agentIds.length === 0) {
      return NextResponse.json({ error: 'No agent IDs provided' }, { status: 400 })
    }

    const agents = await prisma.agent.findMany({ where: { id: { in: agentIds } } })

    const results: { name: string; success: boolean; action: string; error?: string }[] = []

    for (const agent of agents) {
      try {
        const [firstName, ...rest] = (agent.name || '').trim().split(/\s+/)
        const e164Phone = toE164(agent.phone)

        const payload: Record<string, unknown> = {
          locationId,
          firstName: firstName || undefined,
          lastName: rest.join(' ') || undefined,
          email: agent.email || undefined,
          phone: e164Phone,
          tags: ['CHT Agent'],
          source: 'CHT System',
        }
        // Strip undefined
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k])

        // Upsert: GHL matches phone first, then email, then creates new
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
          results.push({ name: agent.name, success: false, action: 'skipped', error: `${res.status} - ${errText}` })
          continue
        }

        const data = await res.json()
        const ghlId = data.contact?.id || null
        const action = data.traceId ? 'updated' : 'created'

        if (ghlId) {
          await prisma.agent.update({ where: { id: agent.id }, data: { ghlContactId: ghlId } })
        }

        results.push({ name: agent.name, success: true, action })
      } catch (err: unknown) {
        results.push({ name: agent.name, success: false, action: 'skipped', error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    const success = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    return NextResponse.json({ success: true, results, summary: { success, failed, total: results.length } })
  } catch (err: unknown) {
    console.error('push-to-ghl agents error:', err)
    return NextResponse.json({ error: 'Failed to push agents to GHL' }, { status: 500 })
  }
}
