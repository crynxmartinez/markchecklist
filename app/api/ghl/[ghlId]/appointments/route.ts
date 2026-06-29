import { NextResponse } from 'next/server'

const GHL_API_BASE = 'https://services.leadconnectorhq.com'
const GHL_API_VERSION = '2021-07-28'

export async function GET(
  request: Request,
  { params }: { params: { ghlId: string } }
) {
  try {
    const { ghlId } = params
    const apiKey = process.env.GHL_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: 'GHL API key not configured' }, { status: 500 })
    }

    const response = await fetch(`${GHL_API_BASE}/contacts/${ghlId}/appointments`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Version: GHL_API_VERSION,
        Accept: 'application/json',
      },
    })

    if (!response.ok) {
      return NextResponse.json({ upcoming: [], past: [] })
    }

    const data = await response.json()
    const appointments = data.events || data.appointments || []

    const now = new Date()
    const sorted = appointments.sort((a: { startTime?: string; start?: string }, b: { startTime?: string; start?: string }) => {
      return new Date(a.startTime || a.start || 0).getTime() - new Date(b.startTime || b.start || 0).getTime()
    })

    const upcoming = sorted.filter((apt: { startTime?: string; start?: string }) => new Date(apt.startTime || apt.start || 0) >= now)
    const past = sorted.filter((apt: { startTime?: string; start?: string }) => new Date(apt.startTime || apt.start || 0) < now).reverse()

    return NextResponse.json({ upcoming, past })
  } catch (error) {
    console.error('Error fetching GHL appointments:', error)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}
