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

interface CreateContactParams {
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
  source?: string
  locationId: string
  apiKey: string
}

interface UpdateContactParams {
  contactId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags?: string[]
  source?: string
  apiKey: string
}

export async function createGHLContact(params: CreateContactParams) {
  try {
    console.log('Creating GHL contact:', params)
    
    const response = await fetch(`${GHL_API_BASE}/contacts/`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        tags: params.tags || [],
        source: params.source,
        locationId: params.locationId,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL create contact error:', errorText)
      throw new Error(`Failed to create contact: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Contact created successfully:', data)
    return data.contact as GHLContact
  } catch (error) {
    console.error('Error creating GHL contact:', error)
    throw error
  }
}

export async function updateGHLContact(params: UpdateContactParams) {
  try {
    console.log('Updating GHL contact:', params.contactId)
    
    const response = await fetch(`${GHL_API_BASE}/contacts/${params.contactId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${params.apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firstName: params.firstName,
        lastName: params.lastName,
        email: params.email,
        phone: params.phone,
        tags: params.tags,
        source: params.source,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL update contact error:', errorText)
      throw new Error(`Failed to update contact: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Contact updated successfully:', data)
    return data.contact as GHLContact
  } catch (error) {
    console.error('Error updating GHL contact:', error)
    throw error
  }
}

export async function deleteGHLContact(contactId: string, apiKey: string) {
  try {
    console.log('Deleting GHL contact:', contactId)
    
    const response = await fetch(`${GHL_API_BASE}/contacts/${contactId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL delete contact error:', errorText)
      throw new Error(`Failed to delete contact: ${response.status} ${response.statusText}`)
    }

    console.log('Contact deleted successfully')
    return true
  } catch (error) {
    console.error('Error deleting GHL contact:', error)
    throw error
  }
}

interface GHLPipelineStage {
  id: string
  name: string
  position: number
}

interface GHLPipeline {
  id: string
  name: string
  stages: GHLPipelineStage[]
  locationId: string
}

interface GHLOpportunity {
  id: string
  name: string
  monetaryValue?: number
  pipelineId: string
  pipelineStageId: string
  status: string
  contact: {
    id: string
    name?: string
    email?: string
    phone?: string
    tags?: string[]
  }
  notes?: string[]
  createdAt?: string
  updatedAt?: string
}

export async function fetchGHLPipelines(locationId: string, apiKey: string): Promise<GHLPipeline[]> {
  try {
    console.log('Fetching GHL pipelines for location:', locationId)
    
    const response = await fetch(`${GHL_API_BASE}/opportunities/pipelines?locationId=${locationId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL pipelines error:', errorText)
      throw new Error(`Failed to fetch pipelines: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Pipelines fetched:', data.pipelines?.length || 0)
    return data.pipelines || []
  } catch (error) {
    console.error('Error fetching GHL pipelines:', error)
    throw error
  }
}

export async function fetchGHLOpportunities(
  locationId: string, 
  pipelineId: string, 
  apiKey: string
): Promise<GHLOpportunity[]> {
  const opportunities: GHLOpportunity[] = []
  let page = 1
  const limit = 100

  try {
    console.log('Fetching GHL opportunities for pipeline:', pipelineId)
    
    while (true) {
      const url = `${GHL_API_BASE}/opportunities/search?locationId=${locationId}&pipelineId=${pipelineId}&limit=${limit}&page=${page}`
      
      console.log('Fetching page:', page)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GHL opportunities error:', errorText)
        throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const batch = data.opportunities || []
      
      console.log(`Page ${page}: ${batch.length} opportunities`)
      
      if (batch.length === 0) {
        break
      }

      opportunities.push(...batch)
      
      if (batch.length < limit) {
        break
      }
      
      page++
    }

    console.log('Total opportunities fetched:', opportunities.length)
    return opportunities
  } catch (error) {
    console.error('Error fetching GHL opportunities:', error)
    throw error
  }
}
