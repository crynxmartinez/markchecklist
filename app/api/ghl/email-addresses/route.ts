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

    // Fetch custom email addresses from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/locations/${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
        },
      }
    )

    if (!response.ok) {
      console.error('Failed to fetch location:', response.status)
      return NextResponse.json({ 
        emailAddresses: [{ id: 'default', email: process.env.GHL_EMAIL_FROM || 'noreply@example.com', name: 'Default' }] 
      })
    }

    const data = await response.json()
    
    // Extract email addresses from location data
    const emails = []
    
    if (data.location?.email) {
      emails.push({ id: 'location', email: data.location.email, name: 'Location Email' })
    }
    
    if (data.location?.settings?.emailProvider?.supportEmail) {
      emails.push({ id: 'support', email: data.location.settings.emailProvider.supportEmail, name: 'Support Email' })
    }

    // Add default if no emails found
    if (emails.length === 0) {
      emails.push({ id: 'default', email: process.env.GHL_EMAIL_FROM || 'noreply@example.com', name: 'Default' })
    }

    return NextResponse.json({ emailAddresses: emails })
  } catch (error) {
    console.error('Error fetching email addresses:', error)
    return NextResponse.json({ 
      emailAddresses: [{ id: 'default', email: process.env.GHL_EMAIL_FROM || 'noreply@example.com', name: 'Default' }] 
    })
  }
}
