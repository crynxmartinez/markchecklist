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

    // Upsert contact to GHL using lookup by email
    debugInfo.steps.push('� Upserting contact to GHL')
    
    const upsertPayload = {
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
    
    // Use GHL's upsert endpoint with email lookup
    const upsertResponse = await fetch(
      'https://services.leadconnectorhq.com/contacts/upsert',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${ghlApiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(upsertPayload)
      }
    )
    
    const upsertData = await upsertResponse.json()
    debugInfo.ghlApiCalls.push({
      action: 'UPSERT',
      payload: upsertPayload,
      status: upsertResponse.status,
      response: upsertData
    })
    
    if (upsertResponse.ok) {
      debugInfo.steps.push('✅ Contact upserted successfully in GHL')
    } else {
      debugInfo.steps.push(`❌ GHL upsert failed: ${upsertData.message || 'Unknown error'}`)
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
