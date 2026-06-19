import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, AGENT_CONTRACT_CONFIG } from '@/lib/entities'

export async function GET() {
  try {
    const agents = await prisma.agentContract.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ agents })
  } catch (error) {
    console.error('Error fetching agent contracts:', error)
    return NextResponse.json({ error: 'Failed to fetch agent contracts' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, AGENT_CONTRACT_CONFIG)
    const agent = await prisma.agentContract.create({ data })
    return NextResponse.json({ success: true, agent })
  } catch (error) {
    console.error('Error creating agent contract:', error)
    return NextResponse.json({ error: 'Failed to create agent contract' }, { status: 500 })
  }
}
