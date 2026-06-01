import { NextResponse } from 'next/server'
import { fetchGHLPipelines, fetchGHLOpportunities } from '@/lib/ghl'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { pipelineName } = body

    // Step 1: Fetch all pipelines from GHL
    console.log('Fetching pipelines...')
    const pipelines = await fetchGHLPipelines(locationId, apiKey)
    
    if (pipelines.length === 0) {
      return NextResponse.json(
        { error: 'No pipelines found in GHL' },
        { status: 404 }
      )
    }

    // Find the specified pipeline or use the first one
    const targetPipeline = pipelineName 
      ? pipelines.find(p => p.name.toLowerCase().includes(pipelineName.toLowerCase()))
      : pipelines[0]

    if (!targetPipeline) {
      return NextResponse.json(
        { 
          error: `Pipeline "${pipelineName}" not found`,
          availablePipelines: pipelines.map(p => p.name)
        },
        { status: 404 }
      )
    }

    console.log('Using pipeline:', targetPipeline.name)
    console.log('GHL Stages:', targetPipeline.stages.map(s => s.name))

    // Step 2: Get our stages from database
    const ourStages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' }
    })

    console.log('Our stages:', ourStages.map(s => s.name))

    // Step 3: Create a mapping from GHL stage ID to our stage ID (by name match)
    const stageMapping: Record<string, string> = {}
    
    for (const ghlStage of targetPipeline.stages) {
      const ourStage = ourStages.find(s => 
        s.name.toLowerCase().trim() === ghlStage.name.toLowerCase().trim()
      )
      
      if (ourStage) {
        stageMapping[ghlStage.id] = ourStage.id
        console.log(`Mapped: "${ghlStage.name}" -> "${ourStage.name}"`)
      } else {
        console.log(`No match for GHL stage: "${ghlStage.name}"`)
      }
    }

    // Step 4: Fetch opportunities from GHL
    console.log('Fetching opportunities...')
    const opportunities = await fetchGHLOpportunities(locationId, targetPipeline.id, apiKey)

    // Track stats
    let contactsUpdated = 0
    let contactsAdded = 0
    let notesSynced = 0
    let noStageMatch = 0

    // Collect all GHL contact IDs in pipeline for later removal check
    const ghlContactIdsInPipeline: string[] = []

    // Step 5: Process each opportunity
    console.log('Processing opportunities...')
    for (const opp of opportunities) {
      const ghlContactId = opp.contact?.id
      if (!ghlContactId) continue

      const ourStageId = stageMapping[opp.pipelineStageId]
      if (!ourStageId) {
        noStageMatch++
        continue
      }

      ghlContactIdsInPipeline.push(ghlContactId)

      // Parse contact name
      const contactName = opp.contact.name || ''
      const nameParts = contactName.split(' ')
      const firstName = nameParts[0] || null
      const lastName = nameParts.slice(1).join(' ') || null

      // Check if contact exists
      const existingContact = await prisma.contact.findUnique({
        where: { ghlContactId }
      })

      if (existingContact) {
        // Update existing contact
        await prisma.contact.update({
          where: { ghlContactId },
          data: {
            firstName: firstName || existingContact.firstName,
            lastName: lastName || existingContact.lastName,
            email: opp.contact.email || existingContact.email,
            phone: opp.contact.phone || existingContact.phone,
            tags: opp.contact.tags || existingContact.tags,
            recruitmentStage: ourStageId,
            lastUpdated: new Date()
          }
        })
        contactsUpdated++

        // Sync opportunity notes
        if (opp.notes && opp.notes.length > 0) {
          for (const noteContent of opp.notes) {
            if (!noteContent || noteContent.trim() === '') continue
            
            // Create unique ID for this note (based on content hash)
            const ghlNoteId = `opp_${opp.id}_${Buffer.from(noteContent).toString('base64').substring(0, 20)}`
            
            // Check if note already exists
            const existingNote = await prisma.note.findUnique({
              where: { ghlNoteId }
            })

            if (!existingNote) {
              await prisma.note.create({
                data: {
                  contactId: existingContact.id,
                  content: noteContent,
                  ghlNoteId,
                  isFromGHL: true
                }
              })
              notesSynced++
            }
          }
        }
      } else {
        // Create new contact
        const newContact = await prisma.contact.create({
          data: {
            ghlContactId,
            firstName,
            lastName,
            email: opp.contact.email || null,
            phone: opp.contact.phone || null,
            tags: opp.contact.tags || [],
            recruitmentStage: ourStageId,
            dateAdded: new Date(),
            lastUpdated: new Date()
          }
        })
        contactsAdded++

        // Sync opportunity notes for new contact
        if (opp.notes && opp.notes.length > 0) {
          for (const noteContent of opp.notes) {
            if (!noteContent || noteContent.trim() === '') continue
            
            const ghlNoteId = `opp_${opp.id}_${Buffer.from(noteContent).toString('base64').substring(0, 20)}`
            
            await prisma.note.create({
              data: {
                contactId: newContact.id,
                content: noteContent,
                ghlNoteId,
                isFromGHL: true
              }
            })
            notesSynced++
          }
        }
      }
    }

    // Step 6: Remove from recruitment - contacts no longer in GHL pipeline
    console.log('Removing contacts no longer in pipeline...')
    const removedResult = await prisma.contact.updateMany({
      where: {
        recruitmentStage: { not: null },
        ghlContactId: { notIn: ghlContactIdsInPipeline }
      },
      data: { recruitmentStage: null }
    })
    const contactsRemoved = removedResult.count

    return NextResponse.json({
      success: true,
      pipeline: targetPipeline.name,
      ghlStages: targetPipeline.stages.map(s => s.name),
      ourStages: ourStages.map(s => s.name),
      stagesMapped: Object.keys(stageMapping).length,
      totalOpportunities: opportunities.length,
      contactsUpdated,
      contactsAdded,
      contactsRemoved,
      notesSynced,
      noStageMatch,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to sync data from GHL', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// GET endpoint to preview pipelines and debug
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

    const pipelines = await fetchGHLPipelines(locationId, apiKey)
    const ourStages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' }
    })

    // Debug: Check how many contacts have recruitmentStage set
    const totalContacts = await prisma.contact.count()

    // Count contacts per stage
    const stageIds = ourStages.map(s => s.id)
    const contactsWithValidStage = await prisma.contact.count({
      where: {
        recruitmentStage: { in: stageIds }
      }
    })

    const contactsWithOldValue = await prisma.contact.count({
      where: {
        recruitmentStage: { notIn: [...stageIds, ''] },
        NOT: { recruitmentStage: null }
      }
    })

    // Get sample of contacts with VALID stages
    const sampleContacts = await prisma.contact.findMany({
      where: { recruitmentStage: { in: stageIds } },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        recruitmentStage: true,
      }
    })

    return NextResponse.json({
      pipelines: pipelines.map(p => ({
        id: p.id,
        name: p.name,
        stages: p.stages.map(s => s.name)
      })),
      ourStages: ourStages.map(s => ({ id: s.id, name: s.name })),
      debug: {
        totalContacts,
        contactsWithValidStage,
        contactsWithOldValue,
        sampleContacts
      }
    })
  } catch (error) {
    console.error('Error fetching pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipelines' },
      { status: 500 }
    )
  }
}
