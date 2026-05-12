import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Upsert - create if not exists, update readAt if exists
    await prisma.conversationRead.upsert({
      where: { ghlConversationId: id },
      update: { readAt: new Date() },
      create: { ghlConversationId: id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking conversation as read:', error)
    return NextResponse.json(
      { error: 'Failed to mark as read' },
      { status: 500 }
    )
  }
}
