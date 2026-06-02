import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all pipelines with their stages
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' }
    })

    // Group stages into a single "Recruitment" pipeline for now
    // In the future, you could have multiple pipelines
    const pipelines = [
      {
        id: 'recruitment',
        name: 'Recruitment Pipeline',
        stages: stages.map(stage => ({
          id: stage.id,
          name: stage.name,
          color: stage.color,
          order: stage.order
        }))
      }
    ]

    return NextResponse.json({ pipelines })
  } catch (error) {
    console.error('Error fetching pipelines:', error)
    return NextResponse.json(
      { error: 'Failed to fetch pipelines' },
      { status: 500 }
    )
  }
}
