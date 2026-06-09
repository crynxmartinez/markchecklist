import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { contactId, type, message, subject } = body

    if (!contactId || !type || !message) {
      return NextResponse.json(
        { error: 'contactId, type, and message are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    // Build request body based on type
    let requestBody: Record<string, unknown> = {
      type: type, // "SMS" or "Email"
      contactId: contactId,
    }

    if (type === 'SMS') {
      requestBody.message = message
    } else if (type === 'Email') {
      requestBody.subject = subject || 'No Subject'
      requestBody.html = message.replace(/\n/g, '<br>')
      requestBody.emailFrom = process.env.GHL_EMAIL_FROM || 'noreply@soldbycht.com'
    }

    console.log('Sending message via GHL:', { type, contactId, messageLength: message.length })

    const response = await fetch(
      `https://services.leadconnectorhq.com/conversations/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL API error:', response.status, errorText)
      return NextResponse.json(
        { error: `Failed to send message: ${response.status}`, details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('Message sent successfully:', data)

    return NextResponse.json({
      success: true,
      messageId: data.messageId || data.id,
      data
    })
  } catch (error) {
    console.error('Error sending message:', error)
    return NextResponse.json(
      { error: 'Failed to send message', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
