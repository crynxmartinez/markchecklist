import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// PUT update agent progress
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { checklistState, percentage } = await request.json()

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: {
        checklistState,
        percentage
      }
    })

    return NextResponse.json(agent)
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
