import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// List recent broadcast campaigns (history).
export async function GET() {
  try {
    const broadcasts = await prisma.broadcast.findMany({
      orderBy: { createdAt: 'desc' },
      take: 30,
    })
    return NextResponse.json({ broadcasts })
  } catch (error) {
    console.error('Error fetching broadcasts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch broadcasts' },
      { status: 500 }
    )
  }
}

// Create a new broadcast campaign (before sending batches).
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { channel, subject, message, audience, total } = body

    if (!channel || !message) {
      return NextResponse.json(
        { error: 'channel and message are required' },
        { status: 400 }
      )
    }
    if (channel === 'EMAIL' && !subject) {
      return NextResponse.json(
        { error: 'subject is required for email broadcasts' },
        { status: 400 }
      )
    }

    const broadcast = await prisma.broadcast.create({
      data: {
        channel,
        subject: channel === 'EMAIL' ? subject : null,
        message,
        audience: audience || 'Agents',
        total: typeof total === 'number' ? total : 0,
        status: 'SENDING',
      },
    })

    return NextResponse.json({ success: true, broadcastId: broadcast.id })
  } catch (error) {
    console.error('Error creating broadcast:', error)
    return NextResponse.json(
      { error: 'Failed to create broadcast' },
      { status: 500 }
    )
  }
}
