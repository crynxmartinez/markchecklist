import { NextResponse } from 'next/server'
import { fetchGHLConversations, fetchGHLMessages } from '@/lib/ghl'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    // Get the contact's GHL ID
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { ghlContactId: true }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    console.log('Fetching conversations for contact:', contact.ghlContactId)

    // Fetch conversations from GHL
    const conversations = await fetchGHLConversations(
      contact.ghlContactId,
      locationId,
      apiKey
    )

    console.log('Found conversations:', conversations.length)

    // If no conversations, return early with debug info
    if (conversations.length === 0) {
      return NextResponse.json({ 
        conversations: [],
        debug: {
          ghlContactId: contact.ghlContactId,
          message: 'No conversations found for this contact in GHL'
        }
      })
    }

    // Fetch messages for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async (conv) => {
        try {
          const messages = await fetchGHLMessages(conv.id, apiKey)
          console.log(`Conversation ${conv.id}: ${messages.length} messages`)
          return {
            ...conv,
            messages: messages.slice(0, 50) // Limit to last 50 messages
          }
        } catch (error) {
          console.error(`Error fetching messages for conversation ${conv.id}:`, error)
          return {
            ...conv,
            messages: []
          }
        }
      })
    )

    return NextResponse.json({ 
      conversations: conversationsWithMessages,
      debug: {
        ghlContactId: contact.ghlContactId,
        totalConversations: conversations.length
      }
    })
  } catch (error) {
    console.error('Error fetching conversations:', error)
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    )
  }
}
