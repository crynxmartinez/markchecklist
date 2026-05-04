import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params
    const body = await request.json()
    const { stage } = body

    if (!stage) {
      return NextResponse.json(
        { error: 'Stage is required' },
        { status: 400 }
      )
    }

    const updatedContact = await prisma.contact.update({
      where: { id },
      data: { recruitmentStage: stage },
    })

    return NextResponse.json({
      success: true,
      contact: updatedContact,
    })
  } catch (error) {
    console.error('Error updating contact stage:', error)
    return NextResponse.json(
      { error: 'Failed to update contact stage' },
      { status: 500 }
    )
  }
}
