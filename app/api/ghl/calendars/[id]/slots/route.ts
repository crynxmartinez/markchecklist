import { NextRequest, NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: calendarId } = await params
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const timezone = searchParams.get('timezone') || 'America/Los_Angeles'

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    // Fetch free slots from GHL
    const response = await fetch(
      `${GHL_API_BASE}/calendars/${calendarId}/free-slots?startDate=${startDate}&endDate=${endDate}&timezone=${encodeURIComponent(timezone)}`,
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
      console.error('GHL free slots error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch free slots from GHL' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('GHL free slots response keys:', Object.keys(data))

    // GHL returns slots organized by date
    // { "2025-12-15": { "slots": ["09:00", "10:00", ...] }, ... }
    // or { slots: [...] } or { availableSlots: [...] }
    
    return NextResponse.json({
      slots: data,
      calendarId,
      startDate,
      endDate,
      timezone
    })
  } catch (error) {
    console.error('Error fetching free slots:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
