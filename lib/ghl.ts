const GHL_API_BASE = 'https://services.leadconnectorhq.com'

interface GHLContact {
  id: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
  source?: string
  dateAdded?: string
  dateUpdated?: string
  customFields?: Record<string, any>
}

interface GHLContactsResponse {
  contacts: GHLContact[]
  meta?: {
    total: number
    nextPageUrl?: string
  }
}

export async function fetchGHLContacts(locationId: string, apiKey: string) {
  const contacts: GHLContact[] = []
  let nextPageUrl: string | undefined = `${GHL_API_BASE}/contacts/?locationId=${locationId}`

  try {
    console.log('Starting GHL contact fetch for location:', locationId)
    
    while (nextPageUrl) {
      console.log('Fetching from URL:', nextPageUrl)
      
      const response = await fetch(nextPageUrl, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Version: '2021-07-28',
        },
      })

      console.log('Response status:', response.status)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GHL API error response:', errorText)
        throw new Error(`GHL API error: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data: GHLContactsResponse = await response.json()
      console.log('Received data:', { 
        contactCount: data.contacts?.length || 0, 
        hasNextPage: !!data.meta?.nextPageUrl,
        total: data.meta?.total 
      })
      
      if (data.contacts && data.contacts.length > 0) {
        contacts.push(...data.contacts)
      }

      nextPageUrl = data.meta?.nextPageUrl
    }

    console.log('Total contacts fetched:', contacts.length)
    return contacts
  } catch (error) {
    console.error('Error fetching GHL contacts:', error)
    throw error
  }
}

export async function getGHLContact(contactId: string, apiKey: string) {
  try {
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: '2021-07-28',
      },
    })

    if (!response.ok) {
      throw new Error(`GHL API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.contact as GHLContact
  } catch (error) {
    console.error('Error fetching GHL contact:', error)
    throw error
  }
}
