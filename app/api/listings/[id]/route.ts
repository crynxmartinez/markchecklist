import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeBody, LISTING_CONFIG } from '@/lib/entities'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const listing = await prisma.listing.findUnique({ where: { id: params.id } })
    if (!listing) {
      return NextResponse.json({ error: 'Listing not found' }, { status: 404 })
    }
    return NextResponse.json({ listing })
  } catch (error) {
    console.error('Error fetching listing:', error)
    return NextResponse.json({ error: 'Failed to fetch listing' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const data = sanitizeBody(body, LISTING_CONFIG)
    const listing = await prisma.listing.update({ where: { id: params.id }, data })
    return NextResponse.json({ success: true, listing })
  } catch (error) {
    console.error('Error updating listing:', error)
    return NextResponse.json({ error: 'Failed to update listing' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.listing.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting listing:', error)
    return NextResponse.json({ error: 'Failed to delete listing' }, { status: 500 })
  }
}
