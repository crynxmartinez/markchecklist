import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const recipients = await prisma.broadcastRecipient.findMany({
      where: { broadcastId: params.id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true,
        error: true,
      },
    })
    return NextResponse.json({ recipients })
  } catch (error) {
    console.error('Error fetching broadcast recipients:', error)
    return NextResponse.json(
      { error: 'Failed to fetch recipients' },
      { status: 500 }
    )
  }
}
