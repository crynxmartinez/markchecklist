import { NextResponse } from 'next/server'
import { createGHLContact } from '@/lib/ghl'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API credentials not configured' },
        { status: 500 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, tags, source, subAccount } = body

    // Create in GHL first
    const ghlContact = await createGHLContact({
      firstName,
      lastName,
      email,
      phone,
      tags,
      source,
      locationId,
      apiKey,
    })

    // Then save to our database
    const contact = await prisma.contact.create({
      data: {
        ghlContactId: ghlContact.id,
        firstName: ghlContact.firstName,
        lastName: ghlContact.lastName,
        email: ghlContact.email,
        phone: ghlContact.phone,
        tags: ghlContact.tags || [],
        source: ghlContact.source,
        subAccount: subAccount || 'Cory Home Team Agent Recruiter',
        dateAdded: ghlContact.dateAdded ? new Date(ghlContact.dateAdded) : new Date(),
        lastUpdated: ghlContact.dateUpdated ? new Date(ghlContact.dateUpdated) : new Date(),
        customFields: ghlContact.customFields || Prisma.JsonNull,
      },
    })

    return NextResponse.json({
      success: true,
      contact,
    })
  } catch (error) {
    console.error('Error creating contact:', error)
    return NextResponse.json(
      { 
        error: 'Failed to create contact', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
