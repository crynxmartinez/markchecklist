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
      // Find matching stage by name (case-insensitive)
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

    // Step 5: Group opportunities by stage for batch updates
    const updatesByStage: Record<string, string[]> = {}
    let noStageMatch = 0
    let noContact = 0

    for (const opp of opportunities) {
      const ghlContactId = opp.contact?.id
      if (!ghlContactId) {
        noContact++
        continue
      }

      const ourStageId = stageMapping[opp.pipelineStageId]
      if (!ourStageId) {
        noStageMatch++
        continue
      }

      if (!updatesByStage[ourStageId]) {
        updatesByStage[ourStageId] = []
      }
      updatesByStage[ourStageId].push(ghlContactId)
    }

    // Step 6: Batch update contacts by stage (much faster!)
    console.log('Batch updating contacts...')
    let updated = 0

    for (const [stageId, ghlContactIds] of Object.entries(updatesByStage)) {
      const result = await prisma.contact.updateMany({
        where: { 
          ghlContactId: { in: ghlContactIds }
        },
        data: { recruitmentStage: stageId }
      })
      updated += result.count
      console.log(`Updated ${result.count} contacts to stage ${stageId}`)
    }

    return NextResponse.json({
      success: true,
      pipeline: targetPipeline.name,
      ghlStages: targetPipeline.stages.map(s => s.name),
      ourStages: ourStages.map(s => s.name),
      stagesMapped: Object.keys(stageMapping).length,
      totalOpportunities: opportunities.length,
      contactsUpdated: updated,
      noStageMatch,
      noContact,
    })
  } catch (error) {
    console.error('Import error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to import opportunities', 
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
    const contactsWithStage = await prisma.contact.count({
      where: {
        recruitmentStage: { not: null }
      }
    })

    const totalContacts = await prisma.contact.count()

    // Get sample of contacts with stages
    const sampleContacts = await prisma.contact.findMany({
      where: { recruitmentStage: { not: null } },
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
        contactsWithStage,
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
