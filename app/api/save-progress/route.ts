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

    if (!ghlApiKey || !ghlLocationId) {
      console.error('GHL credentials missing')
      return NextResponse.json({ 
        success: true, 
        message: 'Saved to database, but GHL sync failed (missing credentials)' 
      })
    }

    // Search for existing contact by email
    const searchResponse = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${ghlLocationId}&email=${encodeURIComponent(email)}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    )

    const searchData = await searchResponse.json()
    const existingContact = searchData.contacts && searchData.contacts.length > 0 ? searchData.contacts[0] : null

    if (existingContact) {
      // Update existing contact
      await fetch(
        `https://services.leadconnectorhq.com/contacts/${existingContact.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            customFields: [
              {
                key: 'checklist_',
                field_value: percentage.toString()
              }
            ],
            tags: ['mark checklist']
          })
        }
      )
    } else {
      // Create new contact
      await fetch(
        'https://services.leadconnectorhq.com/contacts/',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${ghlApiKey}`,
            'Version': '2021-07-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId: ghlLocationId,
            email: email,
            customFields: [
              {
                key: 'checklist_',
                field_value: percentage.toString()
              }
            ],
            tags: ['mark checklist']
          })
        }
      )
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
