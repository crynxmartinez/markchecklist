import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, AGENT_CONTRACT_CONFIG } from '@/lib/entities'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const agent = await prisma.agentContract.findUnique({ where: { id: params.id } })
    if (!agent) {
      return NextResponse.json({ error: 'Agent contract not found' }, { status: 404 })
    }
    return NextResponse.json({ agent })
  } catch (error) {
    console.error('Error fetching agent contract:', error)
    return NextResponse.json({ error: 'Failed to fetch agent contract' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, AGENT_CONTRACT_CONFIG)
    const agent = await prisma.agentContract.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, agent })
  } catch (error) {
    console.error('Error updating agent contract:', error)
    return NextResponse.json({ error: 'Failed to update agent contract' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.agentContract.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agent contract:', error)
    return NextResponse.json({ error: 'Failed to delete agent contract' }, { status: 500 })
  }
}
