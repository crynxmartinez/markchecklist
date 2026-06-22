import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { buildContactIndex, resolveContactId } from '@/lib/broadcast'

// Returns all agents with GHL contact resolution + reachability info so the
// Broadcasts UI can preview recipients and explain who will be skipped.
export async function GET() {
  try {
    const [agents, contactIndex] = await Promise.all([
      prisma.agent.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          status: true,
          coach: true,
          leadTeam: true,
          tc: true,
          subscription: true,
          source: true,
          ghlContactId: true,
        },
        orderBy: { name: 'asc' },
      }),
      buildContactIndex(),
    ])

    const recipients = agents.map((a) => {
      const contactId = resolveContactId(a, contactIndex)
      const hasEmail = Boolean(a.email)
      const hasPhone = Boolean(a.phone)
      return {
        id: a.id,
        name: a.name,
        email: a.email,
        phone: a.phone,
        status: a.status,
        coach: a.coach,
        leadTeam: a.leadTeam,
        tc: a.tc,
        subscription: a.subscription,
        source: a.source,
        contactId, // existing GHL contact id (or null = needs create at send time)
        hasEmail,
        hasPhone,
        // Reachability per channel (a missing GHL contact can be created if we
        // have an email/phone to upsert with).
        smsReachable: hasPhone,
        emailReachable: hasEmail,
      }
    })

    return NextResponse.json({ recipients })
  } catch (error) {
    console.error('Error fetching broadcast agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
}
