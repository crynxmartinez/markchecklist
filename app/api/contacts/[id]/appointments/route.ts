import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    // Get contact from database to get GHL contact ID
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { ghlContactId: true }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Fetch appointments from GHL
    const response = await fetch(
      `${GHL_API_BASE}/contacts/${contact.ghlContactId}/appointments`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': GHL_API_VERSION,
          'Accept': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL appointments error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to fetch appointments from GHL' },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('GHL appointments response keys:', Object.keys(data))

    // GHL returns { events: [...] } or { appointments: [...] }
    const appointments = data.events || data.appointments || []

    // Sort by start time, upcoming first
    const sortedAppointments = appointments.sort((a: any, b: any) => {
      const dateA = new Date(a.startTime || a.start).getTime()
      const dateB = new Date(b.startTime || b.start).getTime()
      return dateA - dateB
    })

    // Separate into upcoming and past
    const now = new Date()
    const upcoming = sortedAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.startTime || apt.start)
      return aptDate >= now
    })
    const past = sortedAppointments.filter((apt: any) => {
      const aptDate = new Date(apt.startTime || apt.start)
      return aptDate < now
    }).reverse() // Most recent past first

    return NextResponse.json({
      appointments: sortedAppointments,
      upcoming,
      past,
      total: sortedAppointments.length
    })
  } catch (error) {
    console.error('Error fetching appointments:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { calendarId, startTime, endTime, title, notes } = body

    const apiKey = process.env.GHL_API_KEY
    const locationId = process.env.GHL_LOCATION_ID

    if (!apiKey || !locationId) {
      return NextResponse.json(
        { error: 'GHL API key or location ID not configured' },
        { status: 500 }
      )
    }

    // Get contact from database
    const contact = await prisma.contact.findUnique({
      where: { id },
      select: { ghlContactId: true, email: true, phone: true, firstName: true, lastName: true }
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Create appointment in GHL
    const response = await fetch(
      `${GHL_API_BASE}/calendars/events/appointments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          calendarId,
          locationId,
          contactId: contact.ghlContactId,
          startTime,
          endTime,
          title: title || 'Appointment',
          notes: notes || '',
          appointmentStatus: 'confirmed',
        }),
      }
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error('GHL create appointment error:', response.status, errorText)
      return NextResponse.json(
        { error: 'Failed to create appointment in GHL', details: errorText },
        { status: response.status }
      )
    }

    const data = await response.json()
    console.log('GHL appointment created:', data)

    return NextResponse.json({
      success: true,
      appointment: data
    })
  } catch (error) {
    console.error('Error creating appointment:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
