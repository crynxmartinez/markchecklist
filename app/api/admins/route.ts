import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET all admins
export async function GET() {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: { name: 'asc' },
    })
    return NextResponse.json({ admins })
  } catch (error) {
    console.error('Failed to fetch admins:', error)
    return NextResponse.json({ admins: [] }, { status: 200 })
  }
}

// POST create new admin
export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email } = body

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      )
    }

    const admin = await prisma.admin.create({
      data: {
        name,
        email,
        title: body.title || null,
        phone: body.phone || null,
        googleVoice: body.googleVoice || null,
        dre: body.dre || null,
        dreExpiration: body.dreExpiration || null,
        birthday: body.birthday || null,
        anniversary: body.anniversary || null,
        language: body.language || null,
        mlsId: body.mlsId || null,
        ghlContactId: body.ghlContactId || null,
      },
    })

    return NextResponse.json({ admin })
  } catch (error: unknown) {
    console.error('Failed to create admin:', error)
    if ((error as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: 'Admin with this email already exists' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: 'Failed to create admin' }, { status: 500 })
  }
}
