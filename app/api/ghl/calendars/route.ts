import { NextRequest, NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API key or location ID not configured' },
        { status: 500 }
      )
    }

    // Fetch calendars from GHL
    const response = await fetch(
      `${GHL_API_BASE}/calendars/?locationId=${locationId}`,
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
      console.error('GHL calendars error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch calendars from GHL' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('GHL calendars response keys:', Object.keys(data))

    // GHL returns { calendars: [...] }
    const calendars = data.calendars || []

    return NextResponse.json({
      calendars,
      total: calendars.length
    })
  } catch (error) {
    console.error('Error fetching calendars:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
