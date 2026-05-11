import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { stageIds } = body

    if (!stageIds || !Array.isArray(stageIds) || stageIds.length === 0) {
      return NextResponse.json(
        { error: 'stageIds array is required' },
        { status: 400 }
      )
    }

    // Only fetch contacts that have a valid recruitment stage
    const contacts = await prisma.contact.findMany({
      where: {
        recruitmentStage: { in: stageIds }
      },
      orderBy: {
        lastUpdated: 'desc',
      },
    })

    console.log(`Fetched ${contacts.length} contacts with valid recruitment stages`)

    return NextResponse.json({ contacts })
  } catch (error) {
    console.error('Error fetching recruitment contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contacts' },
      { status: 500 }
    )
  }
}
