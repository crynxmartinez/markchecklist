import { NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    // Fetch messages for this conversation from GHL
    const response = await fetch(
      `${GHL_API_BASE}/conversations/${id}/messages`,
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
      console.error('GHL messages error:', errorText)
      return NextResponse.json(
        { error: 'Failed to fetch messages from GHL' },
        { status: 500 }
      )
    }

    const data = await response.json()
    
    // Sort messages by date (oldest first for chat view)
    const messages = (data.messages || []).sort((a: any, b: any) => {
      const dateA = parseInt(a.dateAdded) || new Date(a.dateAdded).getTime()
      const dateB = parseInt(b.dateAdded) || new Date(b.dateAdded).getTime()
      return dateA - dateB
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
