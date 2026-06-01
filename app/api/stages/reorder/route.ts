import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: Request) {
  try {
    const body = await request.json()
    const { stageIds } = body as { stageIds: string[] }

    if (!stageIds || !Array.isArray(stageIds)) {
      return NextResponse.json(
        { error: 'stageIds array is required' },
        { status: 400 }
      )
    }

    // Update each stage's order based on position in array
    const updates = stageIds.map((id, index) =>
      prisma.pipelineStage.update({
        where: { id },
        data: { order: index }
      })
    )

    await prisma.$transaction(updates)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error reordering stages:', error)
    return NextResponse.json(
      { error: 'Failed to reorder stages' },
      { status: 500 }
    )
  }
}
