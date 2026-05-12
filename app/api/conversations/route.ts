import { NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET() {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    // Fetch conversations from GHL
    const response = await fetch(
      `${GHL_API_BASE}/conversations/search?locationId=${locationId}&limit=100`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': GHL_API_VERSION,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL conversations error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch conversations from GHL' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    // Map to simpler format
    const conversations = (data.conversations || []).map((conv: any) => ({
      id: conv.id,
      contactId: conv.contactId,
      contactName: conv.fullName || conv.contactName || 'Unknown',
      email: conv.email,
      phone: conv.phone,
      lastMessageBody: conv.lastMessageBody,
      lastMessageDate: conv.lastMessageDate,
      type: conv.type,
      unreadCount: conv.unreadCount,
    }))

    return NextResponse.json({ 
      conversations,
      total: data.total 
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
