import { NextResponse } from 'next/server'
import { sendEmail } from '@/lib/ghl'

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
    const { contactId, subject, message } = body

    if (!contactId || !subject || !message) {
      return NextResponse.json(
        { error: 'Contact ID, subject, and message are required' },
        { status: 400 }
      )
    }

    const result = await sendEmail({ contactId, subject, message, apiKey })

    return NextResponse.json({
      success: true,
      message: 'Email sent successfully',
      data: result,
    })
  } catch (error) {
    console.error('Email API error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to send email', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
