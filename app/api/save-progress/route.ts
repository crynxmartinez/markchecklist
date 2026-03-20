import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  const debugInfo: any = {
    steps: [],
    ghlApiCalls: []
  }
  
  try {
    const { agentId, email, checklistState, percentage } = await request.json()

    if (!agentId || !email || !checklistState || percentage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }
    
    debugInfo.steps.push('✅ Request validated')
    debugInfo.requestData = { agentId, email, percentage }

    // 1. Save to Prisma database
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        checklistState,
        percentage
      }
    })
    debugInfo.steps.push('✅ Saved to database')

    // 2. Upsert contact to GHL
    const ghlApiKey = process.env.GHL_API_KEY
    const ghlLocationId = process.env.GHL_LOCATION_ID

    debugInfo.ghlCredentials = {
      apiKeyPresent: !!ghlApiKey,
      apiKeyPrefix: ghlApiKey ? ghlApiKey.substring(0, 10) : 'MISSING',
      locationId: ghlLocationId || 'MISSING'
    }

    if (!ghlApiKey || !ghlLocationId) {
      debugInfo.steps.push('❌ GHL credentials missing')
      return NextResponse.json({ 
        success: true, 
        message: 'Saved to database, but GHL sync failed (missing credentials)',
        debug: debugInfo
      })
    }
    debugInfo.steps.push('✅ GHL credentials found')

    // Search for existing contact by email
    const searchUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${ghlLocationId}&email=${encodeURIComponent(email)}`
    debugInfo.steps.push('🔍 Searching for contact in GHL')
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    })

    const searchData = await searchResponse.json()
    debugInfo.ghlApiCalls.push({
      action: 'SEARCH',
      url: searchUrl,
      status: searchResponse.status,
      response: searchData
    })
    
    const existingContact = searchData.contacts && searchData.contacts.length > 0 ? searchData.contacts[0] : null
    debugInfo.steps.push(existingContact ? `✅ Contact found (ID: ${existingContact.id})` : '➕ Contact not found, will create new')

    if (existingContact) {
      // Update existing contact
      const updatePayload = {
        customFields: [
          {
            key: 'checklist_',
            field_value: percentage.toString()
          }
        ],
        tags: ['mark checklist']
      }
      
      const updateResponse = await fetch(
        `https://services.leadconnectorhq.com/contacts/${existingContact.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        }
      )
      
      const updateData = await updateResponse.json()
      debugInfo.ghlApiCalls.push({
        action: 'UPDATE',
        contactId: existingContact.id,
        payload: updatePayload,
        status: updateResponse.status,
        response: updateData
      })
      debugInfo.steps.push('✅ Contact updated in GHL')
    } else {
      // Create new contact
      const createPayload = {
        locationId: ghlLocationId,
        email: email,
        customFields: [
          {
            key: 'checklist_',
            field_value: percentage.toString()
          }
        ],
        tags: ['mark checklist']
      }
      
      const createResponse = await fetch(
        'https://services.leadconnectorhq.com/contacts/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(createPayload)
        }
      )
      
      const createData = await createResponse.json()
      debugInfo.ghlApiCalls.push({
        action: 'CREATE',
        payload: createPayload,
        status: createResponse.status,
        response: createData
      })
      debugInfo.steps.push('✅ New contact created in GHL')
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Progress saved to database and synced to GHL',
      agent: updatedAgent,
      debug: debugInfo
    })

  } catch (error: any) {
    console.error('Save progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to save progress',
      details: error.message 
    }, { status: 500 })
  }
}
