import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sanitizeTransactionInput } from '@/lib/transactions'

export async function GET() {
  try {
    const transactions = await prisma.transaction.findMany({
      orderBy: { createdAt: 'desc' },
    })
    return NextResponse.json({ transactions })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch transactions' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const data = sanitizeTransactionInput(body)
    const transaction = await prisma.transaction.create({ data })
    return NextResponse.json({ success: true, transaction })
  } catch (error) {
    console.error('Error creating transaction:', error)
    return NextResponse.json(
      { error: 'Failed to create transaction' },
      { status: 500 }
    )
  }
}
