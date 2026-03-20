import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const { agentId, email, checklistState, percentage } = await request.json()

    if (!agentId || !email || !checklistState || percentage === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // 1. Save to Prisma database
    const updatedAgent = await prisma.agent.update({
      where: { id: agentId },
      data: {
        checklistState,
        percentage
      }
    })

    // 2. Upsert contact to GHL
    const ghlApiKey = process.env.GHL_API_KEY
    const ghlLocationId = process.env.GHL_LOCATION_ID

    console.log('🔑 GHL API Key:', ghlApiKey ? `${ghlApiKey.substring(0, 10)}...` : 'MISSING')
    console.log('📍 GHL Location ID:', ghlLocationId || 'MISSING')

    if (!ghlApiKey || !ghlLocationId) {
      console.error('❌ GHL credentials missing')
      return NextResponse.json({ 
        success: true, 
        message: 'Saved to database, but GHL sync failed (missing credentials)' 
      })
    }

    // Search for existing contact by email
    console.log('🔍 Searching for contact with email:', email)
    const searchUrl = `https://services.leadconnectorhq.com/contacts/?locationId=${ghlLocationId}&email=${encodeURIComponent(email)}`
    console.log('🌐 Search URL:', searchUrl)
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${ghlApiKey}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    })

    console.log('📡 Search Response Status:', searchResponse.status)
    const searchData = await searchResponse.json()
    console.log('📦 Search Response Data:', JSON.stringify(searchData, null, 2))
    
    const existingContact = searchData.contacts && searchData.contacts.length > 0 ? searchData.contacts[0] : null
    console.log('👤 Existing Contact:', existingContact ? `Found (ID: ${existingContact.id})` : 'Not found')

    if (existingContact) {
      // Update existing contact
      console.log('🔄 Updating existing contact:', existingContact.id)
      const updatePayload = {
        customFields: [
          {
            key: 'checklist_',
            field_value: percentage.toString()
          }
        ],
        tags: ['mark checklist']
      }
      console.log('📤 Update Payload:', JSON.stringify(updatePayload, null, 2))
      
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
      
      console.log('📡 Update Response Status:', updateResponse.status)
      const updateData = await updateResponse.json()
      console.log('📦 Update Response Data:', JSON.stringify(updateData, null, 2))
    } else {
      // Create new contact
      console.log('➕ Creating new contact for email:', email)
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
      console.log('📤 Create Payload:', JSON.stringify(createPayload, null, 2))
      
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
      
      console.log('📡 Create Response Status:', createResponse.status)
      const createData = await createResponse.json()
      console.log('📦 Create Response Data:', JSON.stringify(createData, null, 2))
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Progress saved to database and synced to GHL',
      agent: updatedAgent
    })

  } catch (error: any) {
    console.error('Save progress error:', error)
    return NextResponse.json({ 
      error: 'Failed to save progress',
      details: error.message 
    }, { status: 500 })
  }
}
