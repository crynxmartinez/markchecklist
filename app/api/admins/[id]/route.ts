import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET single admin
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const admin = await prisma.admin.findUnique({ where: { id: params.id } })
    if (!admin) {
      return NextResponse.json({ error: 'Admin not found' }, { status: 404 })
    }
    return NextResponse.json({ admin })
  } catch (error) {
    console.error('Failed to fetch admin:', error)
    return NextResponse.json({ error: 'Failed to fetch admin' }, { status: 500 })
  }
}

// PUT update admin
export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const updateData: Record<string, string | null> = {}

    const fields = [
      'title',
      'name',
      'email',
      'phone',
      'googleVoice',
      'dre',
      'dreExpiration',
      'birthday',
      'anniversary',
      'language',
      'mlsId',
      'ghlContactId',
    ] as const

    for (const f of fields) {
      if (body[f] !== undefined) {
        updateData[f] = f === 'name' || f === 'email' ? body[f] : body[f] || null
      }
    }

    const admin = await prisma.admin.update({
      where: { id: params.id },
      data: updateData,
    })

    return NextResponse.json({ admin })
  } catch (error) {
    console.error('Failed to update admin:', error)
    return NextResponse.json({ error: 'Failed to update admin' }, { status: 500 })
  }
}

// DELETE admin
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.admin.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete admin:', error)
    return NextResponse.json({ error: 'Failed to delete admin' }, { status: 500 })
  }
}
