import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const stage = await prisma.pipelineStage.findUnique({
      where: { id },
    })

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      )
    }

    // Get contact count for this stage
    const contactCount = await prisma.contact.count({
      where: { recruitmentStage: id }
    })

    return NextResponse.json({
      ...stage,
      contactCount
    })
  } catch (error) {
    console.error('Error fetching stage:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stage' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { name, color, order } = body

    const stage = await prisma.pipelineStage.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(color && { color }),
        ...(order !== undefined && { order }),
      },
    })

    return NextResponse.json({
      success: true,
      stage,
    })
  } catch (error) {
    console.error('Error updating stage:', error)
    return NextResponse.json(
      { error: 'Failed to update stage' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    // Get the stage to find its name
    const stage = await prisma.pipelineStage.findUnique({
      where: { id },
    })

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage not found' },
        { status: 404 }
      )
    }

    // Clear recruitmentStage for contacts in this stage
    await prisma.contact.updateMany({
      where: { recruitmentStage: stage.id },
      data: { recruitmentStage: null },
    })

    // Delete the stage
    await prisma.pipelineStage.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Stage deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting stage:', error)
    return NextResponse.json(
      { error: 'Failed to delete stage' },
      { status: 500 }
    )
  }
}
