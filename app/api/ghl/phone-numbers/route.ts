import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    // Fetch phone numbers from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}/phone-numbers`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch phone numbers:', response.status)
      // Return default if API fails
      return NextResponse.json({ 
        phoneNumbers: [{ id: 'default', phoneNumber: process.env.GHL_DEFAULT_PHONE || '+1234567890', name: 'Default' }] 
      })
    }

    const data = await response.json()
    return NextResponse.json({ phoneNumbers: data.phoneNumbers || data || [] })
  } catch (error) {
    console.error('Error fetching phone numbers:', error)
    return NextResponse.json({ phoneNumbers: [] })
  }
}
