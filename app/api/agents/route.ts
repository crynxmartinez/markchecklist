import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET all agents
export async function GET() {
  try {
    const agents = await prisma.agent.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(agents)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500 })
  }
}

// POST create new agent
export async function POST(request: Request) {
  try {
    const { name, email } = await request.json()

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    const agent = await prisma.agent.create({
      data: {
        name,
        email,
        checklistState: [],
        percentage: 0
      }
    })

    return NextResponse.json(agent)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Agent with this email already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create agent' }, { status: 500 })
  }
}
