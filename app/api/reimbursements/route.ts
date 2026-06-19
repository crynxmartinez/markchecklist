import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, REIMBURSEMENT_CONFIG } from '@/lib/entities'

export async function GET() {
  try {
    const reimbursements = await prisma.reimbursement.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ reimbursements })
  } catch (error) {
    console.error('Error fetching reimbursements:', error)
    return NextResponse.json({ error: 'Failed to fetch reimbursements' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, REIMBURSEMENT_CONFIG)
    const reimbursement = await prisma.reimbursement.create({ data })
    return NextResponse.json({ success: true, reimbursement })
  } catch (error) {
    console.error('Error creating reimbursement:', error)
    return NextResponse.json({ error: 'Failed to create reimbursement' }, { status: 500 })
  }
}
