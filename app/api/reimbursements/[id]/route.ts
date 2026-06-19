import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, REIMBURSEMENT_CONFIG } from '@/lib/entities'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const reimbursement = await prisma.reimbursement.findUnique({ where: { id: params.id } })
    if (!reimbursement) {
      return NextResponse.json({ error: 'Reimbursement not found' }, { status: 404 })
    }
    return NextResponse.json({ reimbursement })
  } catch (error) {
    console.error('Error fetching reimbursement:', error)
    return NextResponse.json({ error: 'Failed to fetch reimbursement' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, REIMBURSEMENT_CONFIG)
    const reimbursement = await prisma.reimbursement.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, reimbursement })
  } catch (error) {
    console.error('Error updating reimbursement:', error)
    return NextResponse.json({ error: 'Failed to update reimbursement' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.reimbursement.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting reimbursement:', error)
    return NextResponse.json({ error: 'Failed to delete reimbursement' }, { status: 500 })
  }
}
