import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, REFERRAL_CONFIG } from '@/lib/entities'

export async function GET() {
  try {
    const referrals = await prisma.referral.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ referrals })
  } catch (error) {
    console.error('Error fetching referrals:', error)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, REFERRAL_CONFIG)
    const referral = await prisma.referral.create({ data })
    return NextResponse.json({ success: true, referral })
  } catch (error) {
    console.error('Error creating referral:', error)
    return NextResponse.json({ error: 'Failed to create referral' }, { status: 500 })
  }
}
