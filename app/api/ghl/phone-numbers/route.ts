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

    // Fetch active phone numbers from GHL Phone System API
    const response = await fetch(
      `https://services.leadconnectorhq.com/phone-system/numbers/location/${locationId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': '2021-04-15',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Failed to fetch phone numbers:', response.status, errorText)
      
      // Try alternative endpoint
      const altResponse = await fetch(
        `https://services.leadconnectorhq.com/locations/${locationId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Version': '2021-04-15',
          },
        }
      )
      
      if (altResponse.ok) {
        const locationData = await altResponse.json()
        const phones = []
        
        if (locationData.location?.phone) {
          phones.push({ 
            id: 'location', 
            phoneNumber: locationData.location.phone, 
            name: 'Main Line' 
          })
        }
        
        if (phones.length > 0) {
          return NextResponse.json({ phoneNumbers: phones })
        }
      }
      
      // Return default if all fails
      return NextResponse.json({ 
        phoneNumbers: [{ 
          id: 'default', 
          phoneNumber: process.env.GHL_DEFAULT_PHONE || '+1234567890', 
          name: 'Default' 
        }] 
      })
    }

    const data = await response.json()
    
    // Normalize the response
    const phoneNumbers = (data.phoneNumbers || data.numbers || data || []).map((phone: any) => ({
      id: phone.id || phone.phoneNumber,
      phoneNumber: phone.phoneNumber || phone.phone || phone.number,
      name: phone.name || phone.friendlyName || phone.label || ''
    }))

    return NextResponse.json({ phoneNumbers })
  } catch (error) {
    console.error('Error fetching phone numbers:', error)
    return NextResponse.json({ 
      phoneNumbers: [{ 
        id: 'default', 
        phoneNumber: process.env.GHL_DEFAULT_PHONE || '+1234567890', 
        name: 'Default' 
      }] 
    })
  }
}
