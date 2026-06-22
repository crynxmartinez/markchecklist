import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single agent
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agent.findUnique({
      where: { id: params.id }
    })

    if (!agent) {
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 })
    }

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Failed to fetch agent:', error)
    return NextResponse.json({ error: 'Failed to fetch agent' }, { status: 500 })
  }
}

// PUT update agent
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()

    // Handle both checklist updates and full agent updates
    const updateData: any = {}

    // Checklist fields
    if (body.checklistState !== undefined) updateData.checklistState = body.checklistState
    if (body.percentage !== undefined) updateData.percentage = body.percentage

    // Agent roster fields
    if (body.name !== undefined) updateData.name = body.name
    if (body.email !== undefined) updateData.email = body.email
    if (body.phone !== undefined) updateData.phone = body.phone || null
    if (body.status !== undefined) updateData.status = body.status || null
    if (body.leadTeam !== undefined) updateData.leadTeam = body.leadTeam || null
    if (body.coach !== undefined) updateData.coach = body.coach || null
    if (body.agentDevelopment !== undefined) updateData.agentDevelopment = body.agentDevelopment || null
    if (body.dre !== undefined) updateData.dre = body.dre || null
    if (body.dreExpiration !== undefined) {
      updateData.dreExpiration = body.dreExpiration ? new Date(body.dreExpiration) : null
    }
    if (body.birthday !== undefined) updateData.birthday = body.birthday || null
    if (body.anniversary !== undefined) updateData.anniversary = body.anniversary || null
    if (body.language !== undefined) updateData.language = body.language || null
    if (body.mlsId !== undefined) updateData.mlsId = body.mlsId || null
    if (body.subscription !== undefined) updateData.subscription = body.subscription || null
    if (body.isaServices !== undefined) updateData.isaServices = body.isaServices || null
    if (body.tc !== undefined) updateData.tc = body.tc || null
    if (body.source !== undefined) updateData.source = body.source || null
    if (body.ghlContactId !== undefined) updateData.ghlContactId = body.ghlContactId || null

    const agent = await prisma.agent.update({
      where: { id: params.id },
      data: updateData
    })

    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Failed to update agent:', error)
    return NextResponse.json({ error: 'Failed to update agent' }, { status: 500 })
  }
}
