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

    const { adminIds } = await request.json()
    if (!adminIds || !Array.isArray(adminIds) || adminIds.length === 0) {
      return NextResponse.json({ error: 'No admin IDs provided' }, { status: 400 })
    }

    const admins = await prisma.admin.findMany({ where: { id: { in: adminIds } } })

    const results: { name: string; success: boolean; action: string; error?: string }[] = []

    for (const admin of admins) {
      if (!admin.email && !admin.phone) {
        results.push({ name: admin.name, success: false, action: 'skipped', error: 'No email or phone' })
        continue
      }
      try {
        const [firstName, ...rest] = (admin.name || '').trim().split(/\s+/)
        const { ghlId, action } = await ensureGHLContact({
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
        results.push({ name: admin.name, success: true, action })
      } catch (err: unknown) {
        results.push({ name: admin.name, success: false, action: 'skipped', error: err instanceof Error ? err.message : 'Unknown error' })
      }
    }

    const success = results.filter((r) => r.success).length
    const failed = results.filter((r) => !r.success).length
    return NextResponse.json({ success: true, results, summary: { success, failed, total: results.length } })
  } catch (err: unknown) {
    console.error('push-to-ghl admins error:', err)
    return NextResponse.json({ error: 'Failed to push admins to GHL' }, { status: 500 })
  }
}
