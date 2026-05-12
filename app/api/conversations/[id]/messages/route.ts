import { NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = process.env.GHL_API_KEY

    console.log('Fetching messages for conversation:', id)

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    // Fetch messages for this conversation from GHL
    const url = `${GHL_API_BASE}/conversations/${id}/messages`
    console.log('GHL URL:', url)
    
    const response = await fetch(url,
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
    console.log('GHL response keys:', Object.keys(data))
    console.log('Raw messages type:', typeof data.messages)
    console.log('Raw data sample:', JSON.stringify(data).substring(0, 500))
    
    // GHL may return messages as array or object - handle both
    let messagesArray: any[] = []
    if (Array.isArray(data.messages)) {
      messagesArray = data.messages
    } else if (data.messages && typeof data.messages === 'object') {
      // If it's an object with message entries
      messagesArray = Object.values(data.messages)
    } else if (Array.isArray(data)) {
      // If the response itself is an array
      messagesArray = data
    }
    
    console.log('Messages array length:', messagesArray.length)
    
    // Sort messages by date (oldest first for chat view)
    const messages = messagesArray.sort((a: any, b: any) => {
      const dateA = parseInt(a.dateAdded) || new Date(a.dateAdded).getTime()
      const dateB = parseInt(b.dateAdded) || new Date(b.dateAdded).getTime()
      return dateA - dateB
    })

    return NextResponse.json({ 
      messages,
      debug: {
        conversationId: id,
        totalMessages: messages.length,
        rawKeys: Object.keys(data),
        messagesType: typeof data.messages
      }
    })
  } catch (error) {
    console.error('Error fetching messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}
