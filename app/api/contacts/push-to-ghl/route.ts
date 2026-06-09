import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GHL API base URL
const GHL_API_BASE = 'https://services.leadconnectorhq.com'

async function getAccessToken() {
  // Get the access token from environment or refresh it
  const accessToken = process.env.GHL_ACCESS_TOKEN
  if (!accessToken) {
    throw new Error('GHL_ACCESS_TOKEN not configured')
  }
  return accessToken
}

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

    const accessToken = await getAccessToken()
    const locationId = process.env.GHL_LOCATION_ID

    if (!locationId) {
      return NextResponse.json(
        { error: 'GHL_LOCATION_ID not configured' },
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
      
      try {
        // Build the contact payload for GHL
        const payload: any = {
          locationId,
          firstName: contact.firstName || undefined,
          lastName: contact.lastName || undefined,
          email: contact.email || undefined,
          phone: contact.phone || undefined,
          tags: contact.tags || [],
          source: contact.source || undefined,
        }

        // Remove undefined fields
        Object.keys(payload).forEach(key => {
          if (payload[key] === undefined) {
            delete payload[key]
          }
        })

        let response: Response
        let action: 'created' | 'updated' | 'skipped' = 'skipped'
        let ghlContactId = contact.ghlContactId

        if (contact.ghlContactId) {
          // Update existing contact in GHL
          response = await fetch(`${GHL_API_BASE}/contacts/${contact.ghlContactId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28',
            },
            body: JSON.stringify(payload),
          })
          action = 'updated'
        } else {
          // Try to upsert (create or update by email/phone)
          response = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
              'Version': '2021-07-28',
            },
            body: JSON.stringify(payload),
          })
          action = 'created'
        }

        if (!response.ok) {
          const errorText = await response.text()
          results.push({
            contactId: contact.id,
            name,
            email: contact.email || 'N/A',
            success: false,
            action: 'skipped',
            error: `GHL API error: ${response.status} - ${errorText}`,
          })
          continue
        }

        const data = await response.json()
        
        // If we created a new contact, save the GHL contact ID
        if (!contact.ghlContactId && data.contact?.id) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: { ghlContactId: data.contact.id }
          })
          ghlContactId = data.contact.id
        }

        results.push({
          contactId: contact.id,
          name,
          email: contact.email || 'N/A',
          success: true,
          action,
          ghlContactId: ghlContactId || undefined,
        })

      } catch (error: any) {
        results.push({
          contactId: contact.id,
          name,
          email: contact.email || 'N/A',
          success: false,
          action: 'skipped',
          error: error.message,
        })
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
