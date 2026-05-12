import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Get all read conversation IDs
    const readConversations = await prisma.conversationRead.findMany({
      select: { ghlConversationId: true }
    })

    const readIds = readConversations.map(c => c.ghlConversationId)

    return NextResponse.json({ readIds })
  } catch (error) {
    console.error('Error fetching read status:', error)
    return NextResponse.json(
      { error: 'Failed to fetch read status' },
      { status: 500 }
    )
  }
}
