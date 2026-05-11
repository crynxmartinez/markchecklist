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

    // Step 5: Update contacts in our database
    let updated = 0
    let notFound = 0
    let noStageMatch = 0
    const errors: string[] = []

    for (const opp of opportunities) {
      try {
        const ghlContactId = opp.contact?.id
        if (!ghlContactId) {
          errors.push(`Opportunity ${opp.id} has no contact`)
          continue
        }

        // Find our stage ID
        const ourStageId = stageMapping[opp.pipelineStageId]
        if (!ourStageId) {
          noStageMatch++
          continue
        }

        // Update contact's recruitment stage
        const result = await prisma.contact.updateMany({
          where: { ghlContactId },
          data: { recruitmentStage: ourStageId }
        })

        if (result.count > 0) {
          updated++
        } else {
          notFound++
        }
      } catch (err) {
        errors.push(`Error processing opportunity ${opp.id}: ${err}`)
      }
    }

    return NextResponse.json({
      success: true,
      pipeline: targetPipeline.name,
      ghlStages: targetPipeline.stages.map(s => s.name),
      ourStages: ourStages.map(s => s.name),
      stagesMapped: Object.keys(stageMapping).length,
      totalOpportunities: opportunities.length,
      contactsUpdated: updated,
      contactsNotFound: notFound,
      noStageMatch,
      errors: errors.slice(0, 10) // Limit errors shown
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

// GET endpoint to preview pipelines
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

    return NextResponse.json({
      pipelines: pipelines.map(p => ({
        id: p.id,
        name: p.name,
        stages: p.stages.map(s => s.name)
      })),
      ourStages: ourStages.map(s => s.name)
    })
  } catch (error) {
    console.error('Error fetching pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipelines' },
      { status: 500 }
    )
  }
}
