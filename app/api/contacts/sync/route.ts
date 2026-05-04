import { NextResponse } from 'next/server'
import { fetchGHLContacts } from '@/lib/ghl'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID
    
    // Get subAccount from request body
    const body = await request.json().catch(() => ({}))
    const subAccount = body.subAccount || 'Cory Home Team Agent Recruiter'

    console.log('Sync started with:', { 
      hasApiKey: !!apiKey, 
      hasLocationId: !!locationId,
      locationId: locationId,
      subAccount: subAccount
    })

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    console.log('Fetching contacts from GHL...')
    const ghlContacts = await fetchGHLContacts(locationId, apiKey)
    console.log('Fetched contacts count:', ghlContacts.length)

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
            subAccount: subAccount,
            dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
            lastUpdated: contact.dateUpdated ? new Date(contact.dateUpdated) : null,
            customFields: contact.customFields || Prisma.JsonNull,
          },
          create: {
            ghlContactId: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            tags: contact.tags || [],
            source: contact.source,
            subAccount: subAccount,
            dateAdded: contact.dateAdded ? new Date(contact.dateAdded) : null,
            lastUpdated: contact.dateUpdated ? new Date(contact.dateUpdated) : null,
            customFields: contact.customFields || Prisma.JsonNull,
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
