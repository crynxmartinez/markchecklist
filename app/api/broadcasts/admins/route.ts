import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildContactIndex, resolveContactId } from '@/lib/broadcast'

// Returns all admins with GHL contact resolution + reachability so the
// Broadcasts UI can preview recipients on the Admins tab.
export async function GET() {
  try {
    const [admins, contactIndex] = await Promise.all([
      prisma.admin.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          title: true,
          language: true,
          ghlContactId: true,
        },
        orderBy: { name: 'asc' },
      }),
      buildContactIndex(),
    ])

    const recipients = admins.map((a) => {
      const contactId = resolveContactId(a, contactIndex)
      const hasEmail = Boolean(a.email)
      const hasPhone = Boolean(a.phone)
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        // Mapped to the same shape the UI uses for agents (title shown as status).
        status: a.title,
        title: a.title,
        language: a.language,
        contactId,
        hasEmail,
        hasPhone,
        smsReachable: hasPhone,
        emailReachable: hasEmail,
      }
    })

    return NextResponse.json({ recipients })
  } catch (error) {
    console.error('Error fetching broadcast admins:', error)
    return NextResponse.json({ error: 'Failed to fetch admins' }, { status: 500 })
  }
}
