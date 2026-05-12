import { NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(request: Request) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json({ error: 'Missing GHL credentials' }, { status: 500 })
    }

    // Get first conversation
    const convUrl = `${GHL_API_BASE}/conversations/search?locationId=${locationId}&limit=1`
    const convResponse = await fetch(convUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Accept': 'application/json',
      },
    })
    const convData = await convResponse.json()
    const conversationId = convData.conversations?.[0]?.id

    if (!conversationId) {
      return NextResponse.json({ error: 'No conversations found' })
    }

    // Get messages for that conversation - RAW response
    const msgUrl = `${GHL_API_BASE}/conversations/${conversationId}/messages`
    const msgResponse = await fetch(msgUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Accept': 'application/json',
      },
    })
    const msgData = await msgResponse.json()

    return NextResponse.json({
      conversationId,
      rawResponseKeys: Object.keys(msgData),
      rawResponseType: typeof msgData.messages,
      isMessagesArray: Array.isArray(msgData.messages),
      firstMessageSample: Array.isArray(msgData.messages) 
        ? msgData.messages[0] 
        : msgData.messages ? Object.entries(msgData.messages)[0] : null,
      rawResponse: JSON.stringify(msgData).substring(0, 2000)
    })

  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
