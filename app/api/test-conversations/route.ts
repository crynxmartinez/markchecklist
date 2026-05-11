import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(request: Request) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json({ error: 'Missing GHL credentials' }, { status: 500 })
    }

    // Get GHL conversations
    const url = `${GHL_API_BASE}/conversations/search?locationId=${locationId}`
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Accept': 'application/json',
      },
    })

    const data = await response.json()
    
    // Get contactIds from GHL conversations
    const ghlContactIds = data.conversations?.map((c: any) => c.contactId) || []
    
    // Check how many of our contacts match these GHL contact IDs
    const matchingContacts = await prisma.contact.findMany({
      where: {
        ghlContactId: { in: ghlContactIds }
      },
      select: {
        id: true,
        ghlContactId: true,
        firstName: true,
        lastName: true
      }
    })

    // Get a sample of our contacts to see their ghlContactId format
    const sampleContacts = await prisma.contact.findMany({
      take: 5,
      select: {
        id: true,
        ghlContactId: true,
        firstName: true,
        lastName: true
      }
    })

    return NextResponse.json({
      success: response.ok,
      ghlConversationsTotal: data.total,
      ghlConversationsReturned: data.conversations?.length || 0,
      ghlContactIdsFromConversations: ghlContactIds.slice(0, 5),
      matchingContactsInOurDB: matchingContacts.length,
      matchingContactsSample: matchingContacts.slice(0, 3),
      ourContactsSample: sampleContacts
    })

  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
