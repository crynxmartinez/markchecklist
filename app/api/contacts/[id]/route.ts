import { NextResponse } from 'next/server'
import { updateGHLContact, deleteGHLContact } from '@/lib/ghl'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params

    const contact = await prisma.contact.findUnique({
      where: { id },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ contact })
  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    const { id } = params
    const body = await request.json()
    const { firstName, lastName, email, phone, tags, source } = body

    // Get the contact to find GHL ID
    const contact = await prisma.contact.findUnique({
      where: { id },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Update in GHL first
    await updateGHLContact({
      contactId: contact.ghlContactId,
      firstName,
      lastName,
      email,
      phone,
      tags,
      source,
      apiKey,
    })

    // Then update in our database
    const updatedContact = await prisma.contact.update({
      where: { id },
      data: {
        firstName,
        lastName,
        email,
        phone,
        tags: tags || [],
        source,
        lastUpdated: new Date(),
      },
    })

    return NextResponse.json({
      success: true,
      contact: updatedContact,
    })
  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { 
        error: 'Failed to update contact', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json(
        { error: 'GHL API key not configured' },
        { status: 500 }
      )
    }

    const { id } = params

    // Get the contact to find GHL ID
    const contact = await prisma.contact.findUnique({
      where: { id },
    })

    if (!contact) {
      return NextResponse.json(
        { error: 'Contact not found' },
        { status: 404 }
      )
    }

    // Delete from GHL first
    await deleteGHLContact(contact.ghlContactId, apiKey)

    // Then delete from our database
    await prisma.contact.delete({
      where: { id },
    })

    return NextResponse.json({
      success: true,
      message: 'Contact deleted successfully',
    })
  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { 
        error: 'Failed to delete contact', 
        details: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
