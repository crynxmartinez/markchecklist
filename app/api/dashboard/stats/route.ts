import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get contact stats
    const totalContacts = await prisma.contact.count()
    const withEmail = await prisma.contact.count({
      where: { 
        email: { not: null },
        NOT: { email: '' }
      }
    })
    const withPhone = await prisma.contact.count({
      where: { 
        phone: { not: null },
        NOT: { phone: '' }
      }
    })

    // Get pipeline stages
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { order: 'asc' }
    })

    // Get counts per stage
    const stageCounts = await Promise.all(
      stages.map(async (stage) => {
        const count = await prisma.contact.count({
          where: { recruitmentStage: stage.id }
        })
        return {
          id: stage.id,
          name: stage.name,
          color: stage.color,
          order: stage.order,
          count
        }
      })
    )

    // Get total in pipeline (any stage)
    const inPipeline = stageCounts.reduce((sum, stage) => sum + stage.count, 0)

    return NextResponse.json({
      contacts: {
        total: totalContacts,
        withEmail,
        withPhone
      },
      pipeline: {
        total: inPipeline,
        stages: stageCounts
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
