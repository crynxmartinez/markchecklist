import { NextResponse } from 'next/server'
import { fetchGHLConversations, fetchGHLMessages } from '@/lib/ghl'

export async function GET(
  request: Request,
  { params }: { params: { ghlId: string } }
) {
  try {
    const { ghlId } = params
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json({ error: 'GHL API credentials not configured' }, { status: 500 })
    }

    const conversations = await fetchGHLConversations(ghlId, locationId, apiKey)

    if (conversations.length === 0) {
      return NextResponse.json({ conversations: [] })
    }

    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const messages = await fetchGHLMessages(conv.id, apiKey)
          return { ...conv, messages: messages.slice(0, 50) }
        } catch {
          return { ...conv, messages: [] }
        }
      })
    )

    return NextResponse.json({ conversations: conversationsWithMessages })
  } catch (error) {
    console.error('Error fetching GHL conversations:', error)
    return NextResponse.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
