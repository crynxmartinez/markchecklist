import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' },
    })

    // Get contact counts for each stage
    const stagesWithCounts = await Promise.all(
      stages.map(async (stage) => {
        const contactCount = await prisma.contact.count({
          where: { recruitmentStage: stage.id }
        })
        return { ...stage, contactCount }
      })
    )

    return NextResponse.json({ stages: stagesWithCounts })
  } catch (error) {
    console.error('Error fetching stages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stages' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Stage name is required' },
        { status: 400 }
      )
    }

    // Get the highest order number
    const lastStage = await prisma.pipelineStage.findFirst({
      orderBy: { order: 'desc' },
    })

    const newOrder = lastStage ? lastStage.order + 1 : 0

    const stage = await prisma.pipelineStage.create({
      data: {
        name,
        order: newOrder,
        color: color || '#6366f1',
      },
    })

    return NextResponse.json({
      success: true,
      stage,
    })
  } catch (error) {
    console.error('Error creating stage:', error)
    return NextResponse.json(
      { error: 'Failed to create stage' },
      { status: 500 }
    )
  }
}
