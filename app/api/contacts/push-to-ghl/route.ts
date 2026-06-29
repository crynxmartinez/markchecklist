import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { ensureGHLContact } from '@/lib/ghl'

interface PushResult {
  contactId: string
  name: string
  email: string
  success: boolean
  action: 'created' | 'updated' | 'skipped'
  error?: string
  ghlContactId?: string
}

export async function POST(request: NextRequest) {
  try {
    const { contactIds } = await request.json()

    if (!contactIds || !Array.isArray(contactIds) || contactIds.length === 0) {
      return NextResponse.json(
        { error: 'No contact IDs provided' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL credentials not configured' },
        { status: 500 }
      )
    }

    // Fetch the selected contacts from database
    const contacts = await prisma.contact.findMany({
      where: {
        id: { in: contactIds }
      }
    })

    if (contacts.length === 0) {
      return NextResponse.json(
        { error: 'No contacts found with provided IDs' },
        { status: 404 }
      )
    }

    const results: PushResult[] = []

    for (const contact of contacts) {
      const name = `${contact.firstName || ''} ${contact.lastName || ''}`.trim()

      if (!contact.email && !contact.phone) {
        results.push({ contactId: contact.id, name, email: contact.email || 'N/A', success: false, action: 'skipped', error: 'No email or phone' })
        continue
      }

      try {
        const { ghlId, action } = await ensureGHLContact({
          ghlContactId: contact.ghlContactId,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email,
          phone: contact.phone,
          tags: (contact.tags as string[]) || [],
          source: contact.source || undefined,
          locationId,
          apiKey,
        })

        // Save ghlContactId if it was newly resolved
        if (ghlId !== contact.ghlContactId) {
          await prisma.contact.update({ where: { id: contact.id }, data: { ghlContactId: ghlId } })
        }

        results.push({ contactId: contact.id, name, email: contact.email || 'N/A', success: true, action, ghlContactId: ghlId })
      } catch (error: unknown) {
        results.push({ contactId: contact.id, name, email: contact.email || 'N/A', success: false, action: 'skipped', error: error instanceof Error ? error.message : 'Unknown error' })
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return NextResponse.json({
      message: `Pushed ${successCount} contacts to GHL (${failCount} failed)`,
      results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount,
        created: results.filter(r => r.action === 'created' && r.success).length,
        updated: results.filter(r => r.action === 'updated' && r.success).length,
      }
    })

  } catch (error: any) {
    console.error('Error pushing to GHL:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to push contacts to GHL' },
      { status: 500 }
    )
  }
}
