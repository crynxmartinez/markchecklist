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

    // Fetch users/staff from GHL
    const response = await fetch(
      `https://services.leadconnectorhq.com/users/?locationId=${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
        },
      }
    )

    const emails: { id: string; email: string; name: string }[] = []

    if (response.ok) {
      const data = await response.json()
      const users = data.users || data || []
      
      // Extract email addresses from users
      for (const user of users) {
        if (user.email) {
          const name = user.name || user.firstName 
            ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
            : user.email.split('@')[0]
          
          emails.push({
            id: user.id || user.email,
            email: user.email,
            name: name || 'Staff'
          })
        }
      }
    } else {
      console.error('Failed to fetch users:', response.status)
    }

    // Also try to get location email as fallback
    if (emails.length === 0) {
      const locationResponse = await fetch(
        `https://services.leadconnectorhq.com/locations/${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-04-15',
          },
        }
      )

      if (locationResponse.ok) {
        const locationData = await locationResponse.json()
        
        if (locationData.location?.email) {
          emails.push({ 
            id: 'location', 
            email: locationData.location.email, 
            name: 'Location Email' 
          })
        }
        
        if (locationData.location?.settings?.emailProvider?.supportEmail) {
          emails.push({ 
            id: 'support', 
            email: locationData.location.settings.emailProvider.supportEmail, 
            name: 'Support Email' 
          })
        }
      }
    }

    // Add default if no emails found
    if (emails.length === 0) {
      emails.push({ 
        id: 'default', 
        email: process.env.GHL_EMAIL_FROM || 'noreply@example.com', 
        name: 'Default' 
      })
    }

    return NextResponse.json({ emailAddresses: emails })
  } catch (error) {
    console.error('Error fetching email addresses:', error)
    return NextResponse.json({ 
      emailAddresses: [{ 
        id: 'default', 
        email: process.env.GHL_EMAIL_FROM || 'noreply@example.com', 
        name: 'Default' 
      }] 
    })
  }
}
