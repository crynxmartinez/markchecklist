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

    const { adminIds } = await request.json()
    if (!adminIds || !Array.isArray(adminIds) || adminIds.length === 0) {
      return NextResponse.json({ error: 'No admin IDs provided' }, { status: 400 })
    }

    const admins = await prisma.admin.findMany({ where: { id: { in: adminIds } } })

    const results: { name: string; success: boolean; action: string; error?: string }[] = []

    for (const admin of admins) {
      try {
        const e164Phone = toE164(admin.phone)

        // Skip if no identifier — GHL cannot match without email or phone
        if (!admin.email && !e164Phone) {
          results.push({ name: admin.name, success: false, action: 'skipped', error: 'No email or phone' })
          continue
        }

        const [firstName, ...rest] = (admin.name || '').trim().split(/\s+/)

        const payload: Record<string, unknown> = {
          locationId,
          firstName: firstName || undefined,
          lastName: rest.join(' ') || undefined,
          email: admin.email || undefined,
          phone: e164Phone || undefined,
          tags: ['CHT Admin'],
          source: 'CHT System',
        }
        // Strip undefined fields
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
          results.push({ name: admin.name, success: false, action: 'skipped', error: `GHL ${res.status}: ${errText}` })
          continue
        }

        const data = await res.json()
        console.log(`GHL upsert response for ${admin.name}:`, JSON.stringify(data))

        const ghlId = data.contact?.id ?? data.id ?? null
        const action = data.new === false ? 'updated' : 'created'

        if (ghlId) {
          await prisma.admin.update({ where: { id: admin.id }, data: { ghlContactId: ghlId } })
          results.push({ name: admin.name, success: true, action })
        } else {
          results.push({ name: admin.name, success: false, action: 'skipped', error: 'GHL returned no contact ID' })
        }
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
