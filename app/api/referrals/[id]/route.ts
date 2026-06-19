import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, REFERRAL_CONFIG } from '@/lib/entities'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const referral = await prisma.referral.findUnique({ where: { id: params.id } })
    if (!referral) {
      return NextResponse.json({ error: 'Referral not found' }, { status: 404 })
    }
    return NextResponse.json({ referral })
  } catch (error) {
    console.error('Error fetching referral:', error)
    return NextResponse.json({ error: 'Failed to fetch referral' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, REFERRAL_CONFIG)
    const referral = await prisma.referral.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, referral })
  } catch (error) {
    console.error('Error updating referral:', error)
    return NextResponse.json({ error: 'Failed to update referral' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.referral.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting referral:', error)
    return NextResponse.json({ error: 'Failed to delete referral' }, { status: 500 })
  }
}
