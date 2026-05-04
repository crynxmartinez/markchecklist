import { NextResponse } from 'next/server'
import { fetchGHLContacts } from '@/lib/ghl'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    const ghlContacts = await fetchGHLContacts(locationId, apiKey)

    let created = 0
    let updated = 0
    let errors = 0

    for (const contact of ghlContacts) {
      try {
        await prisma.contact.upsert({
          where: { ghlContactId: contact.id },
          update: {
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            tags: contact.tags || [],
            source: contact.source,
            dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
            lastUpdated: contact.dateUpdated ? new Date(contact.dateUpdated) : null,
            customFields: contact.customFields || null,
          },
          create: {
            ghlContactId: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            tags: contact.tags || [],
            source: contact.source,
            dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
            lastUpdated: contact.dateUpdated ? new Date(contact.dateUpdated) : null,
            customFields: contact.customFields || null,
          },
        })

        const existingContact = await prisma.contact.findUnique({
          where: { ghlContactId: contact.id },
        })

        if (existingContact) {
          updated++
        } else {
          created++
        }
      } catch (error) {
        console.error(`Error syncing contact ${contact.id}:`, error)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sync completed: ${created} created, ${updated} updated, ${errors} errors`,
      stats: {
        total: ghlContacts.length,
        created,
        updated,
        errors,
      },
    })
  } catch (error) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: 'Failed to sync contacts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
