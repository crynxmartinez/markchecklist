import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, LISTING_CONFIG } from '@/lib/entities'

export async function GET() {
  try {
    const listings = await prisma.listing.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ listings })
  } catch (error) {
    console.error('Error fetching listings:', error)
    return NextResponse.json({ error: 'Failed to fetch listings' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, LISTING_CONFIG)
    const listing = await prisma.listing.create({ data })
    return NextResponse.json({ success: true, listing })
  } catch (error) {
    console.error('Error creating listing:', error)
    return NextResponse.json({ error: 'Failed to create listing' }, { status: 500 })
  }
}
