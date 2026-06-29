import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureGHLContact } from '@/lib/ghl'

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
      if (!agent.email && !agent.phone) {
        results.push({ name: agent.name, success: false, action: 'skipped', error: 'No email or phone' })
        continue
      }
      try {
        const [firstName, ...rest] = (agent.name || '').trim().split(/\s+/)
        const { ghlId, action } = await ensureGHLContact({
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
