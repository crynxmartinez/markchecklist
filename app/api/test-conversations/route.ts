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

    // Test 1: Try to get all conversations for the location
    console.log('Testing GHL Conversations API...')
    console.log('Location ID:', locationId)
    
    const url = `${GHL_API_BASE}/conversations/search?locationId=${locationId}`
    console.log('Request URL:', url)

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Accept': 'application/json',
      },
    })

    console.log('Response status:', response.status)
    
    const responseText = await response.text()
    console.log('Response body:', responseText.substring(0, 500))

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json({
        error: 'Failed to parse response',
        status: response.status,
        body: responseText.substring(0, 500)
      })
    }

    return NextResponse.json({
      success: response.ok,
      status: response.status,
      conversationsCount: data.conversations?.length || 0,
      conversations: data.conversations?.slice(0, 5) || [],
      total: data.total,
      rawKeys: Object.keys(data)
    })

  } catch (error: any) {
    console.error('Test error:', error)
    return NextResponse.json({
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
