import { NextResponse } from 'next/server'
import { sendSMS } from '@/lib/ghl'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { contactId, message } = body

    if (!contactId || !message) {
      return NextResponse.json(
        { error: 'Contact ID and message are required' },
        { status: 400 }
      )
    }

    const result = await sendSMS({ contactId, message, apiKey })

    return NextResponse.json({
      success: true,
      message: 'SMS sent successfully',
      data: result,
    })
  } catch (error) {
    console.error('SMS API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send SMS', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
