const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

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
  total?: number
  count?: number
  meta?: {
    total: number
    currentPage?: number
    nextPage?: number
    prevPage?: number
  }
}

export async function fetchGHLContacts(locationId: string, apiKey: string) {
  const contacts: GHLContact[] = []
  let startAfterId: string | undefined = undefined
  const limit = 100
  let totalFetched = 0

  try {
    console.log('Starting GHL contact fetch for location:', locationId)
    
    while (true) {
      let url = `${GHL_API_BASE}/contacts/?locationId=${locationId}&limit=${limit}`
      if (startAfterId) {
        url += `&startAfterId=${startAfterId}`
      }
      
      console.log('Fetching from URL:', url)
      console.log('Current total fetched:', totalFetched)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
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
        total: data.total || data.meta?.total,
        currentBatch: totalFetched
      })
      
      if (!data.contacts || data.contacts.length === 0) {
        console.log('No more contacts to fetch')
        break
      }

      contacts.push(...data.contacts)
      totalFetched += data.contacts.length
      
      // Use the last contact's ID for pagination
      const lastContact = data.contacts[data.contacts.length - 1]
      startAfterId = lastContact.id
      
      console.log(`Fetched ${totalFetched} contacts so far, last ID: ${startAfterId}`)
      
      // If we got fewer contacts than the limit, we're done
      if (data.contacts.length < limit) {
        console.log('Received fewer contacts than limit, pagination complete')
        break
      }
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

interface SendSMSParams {
  contactId: string
  message: string
  apiKey: string
}

interface SendEmailParams {
  contactId: string
  subject: string
  message: string
  apiKey: string
}

export async function sendSMS({ contactId, message, apiKey }: SendSMSParams) {
  try {
    console.log('Sending SMS to contact:', contactId)
    
    const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'SMS',
        contactId: contactId,
        message: message,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL SMS error:', errorText)
      throw new Error(`Failed to send SMS: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('SMS sent successfully:', data)
    return data
  } catch (error) {
    console.error('Error sending SMS:', error)
    throw error
  }
}

export async function sendEmail({ contactId, subject, message, apiKey }: SendEmailParams) {
  try {
    console.log('Sending email to contact:', contactId)
    
    const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'Email',
        contactId: contactId,
        subject: subject,
        html: message,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL Email error:', errorText)
      throw new Error(`Failed to send email: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Email sent successfully:', data)
    return data
  } catch (error) {
    console.error('Error sending email:', error)
    throw error
  }
}
