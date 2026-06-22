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
    console.log('Message length:', message.length)
    
    const requestBody = {
      type: 'SMS',
      contactId: contactId,
      message: message,
    }
    
    console.log('Request body:', JSON.stringify(requestBody))
    
    const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('GHL SMS response status:', response.status)
    console.log('GHL SMS response:', responseText)

    if (!response.ok) {
      console.error('GHL SMS error:', responseText)
      throw new Error(`Failed to send SMS: ${response.status} - ${responseText}`)
    }

    const data = JSON.parse(responseText)
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
    console.log('Subject:', subject)
    
    const requestBody = {
      type: 'Email',
      contactId: contactId,
      subject: subject,
      html: message,
      emailFrom: process.env.GHL_EMAIL_FROM || 'noreply@soldbycht.com',
    }
    
    console.log('Request body:', JSON.stringify(requestBody))
    
    const response = await fetch(`${GHL_API_BASE}/conversations/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Version': '2021-04-15',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    const responseText = await response.text()
    console.log('GHL Email response status:', response.status)
    console.log('GHL Email response:', responseText)

    if (!response.ok) {
      console.error('GHL Email error:', responseText)
      throw new Error(`Failed to send email: ${response.status} - ${responseText}`)
    }

    const data = JSON.parse(responseText)
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

// Upserts a contact in GHL (finds existing by email/phone, or creates).
// Returns the contact id so we can send messages to it.
export async function upsertGHLContact(params: CreateContactParams) {
  const response = await fetch(`${GHL_API_BASE}/contacts/upsert`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey}`,
      Version: GHL_API_VERSION,
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
    console.error('GHL upsert contact error:', errorText)
    throw new Error(`Failed to upsert contact: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  return data.contact as GHLContact
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

// Conversations interfaces
export interface GHLConversation {
  id: string
  contactId: string
  locationId: string
  lastMessageBody?: string
  lastMessageDate?: string
  lastMessageType?: string
  type: string
  unreadCount?: number
  fullName?: string
  contactName?: string
  email?: string
  phone?: string
}

export interface GHLMessage {
  id: string
  conversationId: string
  body: string
  type: number // 1 = SMS, 2 = Email, etc.
  direction: string // 'inbound' or 'outbound'
  status: string
  dateAdded: string
  contentType?: string
  attachments?: string[]
  meta?: {
    email?: {
      subject?: string
      from?: string
      to?: string[]
    }
  }
}

export async function fetchGHLConversations(
  contactId: string,
  locationId: string,
  apiKey: string
): Promise<GHLConversation[]> {
  try {
    console.log('Fetching GHL conversations for contact:', contactId)
    
    const response = await fetch(
      `${GHL_API_BASE}/conversations/search?locationId=${locationId}&contactId=${contactId}`,
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
      console.error('GHL conversations error:', errorText)
      throw new Error(`Failed to fetch conversations: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Conversations fetched:', data.conversations?.length || 0)
    return data.conversations || []
  } catch (error) {
    console.error('Error fetching GHL conversations:', error)
    throw error
  }
}

export async function fetchGHLMessages(
  conversationId: string,
  apiKey: string
): Promise<GHLMessage[]> {
  try {
    console.log('Fetching GHL messages for conversation:', conversationId)
    
    const response = await fetch(
      `${GHL_API_BASE}/conversations/${conversationId}/messages`,
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
      console.error('GHL messages error:', response.status, errorText)
      // Return empty array instead of throwing to prevent breaking the UI
      return []
    }

    const data = await response.json()
    console.log('Raw GHL messages response keys:', Object.keys(data))
    
    // GHL returns nested structure: { messages: { lastMessageId, nextPage, messages: [...] } }
    let messagesArray: GHLMessage[] = []
    if (data.messages?.messages && Array.isArray(data.messages.messages)) {
      // Nested structure: data.messages.messages
      messagesArray = data.messages.messages
    } else if (Array.isArray(data.messages)) {
      // Direct array: data.messages
      messagesArray = data.messages
    } else if (Array.isArray(data.data)) {
      messagesArray = data.data
    } else if (Array.isArray(data.items)) {
      messagesArray = data.items
    }
    
    console.log('Messages fetched:', messagesArray.length)
    return messagesArray
  } catch (error) {
    console.error('Error fetching GHL messages:', error)
    // Return empty array instead of throwing
    return []
  }
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
  apiKey: string,
  maxResults: number = 5000 // Increased limit
): Promise<GHLOpportunity[]> {
  const opportunities: GHLOpportunity[] = []
  const limit = 100

  try {
    console.log('Fetching GHL opportunities for pipeline:', pipelineId)
    
    let hasMore = true
    let startAfter: string | undefined = undefined
    let startAfterId: string | undefined = undefined
    
    while (hasMore && opportunities.length < maxResults) {
      // Build URL with query params
      const params = new URLSearchParams({
        location_id: locationId,
        pipeline_id: pipelineId,
        limit: limit.toString(),
      })
      
      // Try both pagination methods
      if (startAfter) {
        params.set('startAfter', startAfter)
      }
      if (startAfterId) {
        params.set('startAfterId', startAfterId)
      }
      
      const url = `${GHL_API_BASE}/opportunities/search?${params.toString()}`
      
      console.log('Fetching opportunities, current count:', opportunities.length)
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': GHL_API_VERSION,
          'Accept': 'application/json',
        },
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('GHL opportunities error:', errorText)
        throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText} - ${errorText}`)
      }

      const data = await response.json()
      const batch = data.opportunities || []
      
      console.log(`Batch: ${batch.length} opportunities`)
      console.log('Response meta:', JSON.stringify(data.meta))
      console.log('Response keys:', Object.keys(data))
      
      if (batch.length === 0) {
        console.log('No more opportunities, stopping')
        hasMore = false
        break
      }

      opportunities.push(...batch)
      
      // Check various pagination methods
      const meta = data.meta || {}
      const nextPage = meta.nextPage || meta.nextPageUrl || meta.next
      const nextCursor = meta.startAfter || meta.startAfterId || meta.cursor || meta.nextCursor
      
      console.log('Next page info:', { nextPage, nextCursor, batchLength: batch.length })
      
      if (nextCursor) {
        startAfter = nextCursor
        startAfterId = nextCursor
      } else if (batch.length >= limit) {
        // Fallback: use last opportunity ID for cursor
        const lastId = batch[batch.length - 1].id
        console.log('Using last ID as cursor:', lastId)
        startAfterId = lastId
        startAfter = lastId
      } else {
        console.log('Batch smaller than limit, no more pages')
        hasMore = false
      }
    }

    console.log('Total opportunities fetched:', opportunities.length)
    return opportunities
  } catch (error) {
    console.error('Error fetching GHL opportunities:', error)
    throw error
  }
}
