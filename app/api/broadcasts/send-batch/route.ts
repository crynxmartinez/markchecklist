import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendSMS, sendEmail, upsertGHLContact } from '@/lib/ghl'
import { personalize } from '@/lib/broadcast'

interface IncomingRecipient {
  agentId?: string
  name?: string
  email?: string
  phone?: string
  contactId?: string | null
}

interface ResultRow {
  agentId?: string
  name?: string
  status: 'SENT' | 'FAILED' | 'SKIPPED'
  error?: string
}

// Sends a single batch of recipients for a broadcast. The client orchestrates
// multiple batches (with progress) to avoid serverless timeouts.
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
    const {
      broadcastId,
      channel,
      subject,
      message,
      createMissing,
      finalize,
      recipients,
    } = body as {
      broadcastId: string
      channel: 'SMS' | 'EMAIL'
      subject?: string
      message: string
      createMissing?: boolean
      finalize?: boolean
      recipients: IncomingRecipient[]
    }

    if (!broadcastId || !channel || !message || !Array.isArray(recipients)) {
      return NextResponse.json(
        { error: 'broadcastId, channel, message and recipients are required' },
        { status: 400 }
      )
    }

    const results: ResultRow[] = []
    let sent = 0
    let failed = 0
    let skipped = 0

    for (const r of recipients) {
      let contactId = r.contactId || null

      // Resolve a GHL contact when none was matched in the preview.
      if (!contactId && createMissing && (r.email || r.phone)) {
        try {
          const [firstName, ...rest] = (r.name || '').trim().split(/\s+/)
          const contact = await upsertGHLContact({
            firstName: firstName || undefined,
            lastName: rest.join(' ') || undefined,
            email: r.email || undefined,
            phone: r.phone || undefined,
            source: 'CHT Broadcast',
            locationId,
            apiKey,
          })
          contactId = contact?.id || null
          // Cache the resolved id on the agent for next time.
          if (contactId && r.agentId) {
            await prisma.agent
              .update({
                where: { id: r.agentId },
                data: { ghlContactId: contactId },
              })
              .catch(() => undefined)
          }
        } catch (err) {
          console.error('upsert failed for', r.name, err)
        }
      }

      if (!contactId) {
        skipped++
        const reason = createMissing
          ? 'No GHL contact and could not be created'
          : 'No matching GHL contact'
        results.push({ agentId: r.agentId, name: r.name, status: 'SKIPPED', error: reason })
        await prisma.broadcastRecipient.create({
          data: {
            broadcastId,
            agentId: r.agentId,
            name: r.name,
            email: r.email,
            phone: r.phone,
            contactId: null,
            status: 'SKIPPED',
            error: reason,
          },
        })
        continue
      }

      const personalized = personalize(message, { name: r.name })

      try {
        if (channel === 'SMS') {
          await sendSMS({ contactId, message: personalized, apiKey })
        } else {
          await sendEmail({
            contactId,
            subject: personalize(subject || '', { name: r.name }) || 'Message',
            message: personalized.replace(/\n/g, '<br>'),
            apiKey,
          })
        }
        sent++
        results.push({ agentId: r.agentId, name: r.name, status: 'SENT' })
        await prisma.broadcastRecipient.create({
          data: {
            broadcastId,
            agentId: r.agentId,
            name: r.name,
            email: r.email,
            phone: r.phone,
            contactId,
            status: 'SENT',
          },
        })
      } catch (err) {
        failed++
        const errMsg = err instanceof Error ? err.message : 'Unknown error'
        results.push({ agentId: r.agentId, name: r.name, status: 'FAILED', error: errMsg })
        await prisma.broadcastRecipient.create({
          data: {
            broadcastId,
            agentId: r.agentId,
            name: r.name,
            email: r.email,
            phone: r.phone,
            contactId,
            status: 'FAILED',
            error: errMsg,
          },
        })
      }
    }

    await prisma.broadcast.update({
      where: { id: broadcastId },
      data: {
        sentCount: { increment: sent },
        failedCount: { increment: failed },
        skippedCount: { increment: skipped },
        ...(finalize ? { status: 'COMPLETED' } : {}),
      },
    })

    return NextResponse.json({ success: true, results, sent, failed, skipped })
  } catch (error) {
    console.error('Error sending broadcast batch:', error)
    return NextResponse.json(
      { error: 'Failed to send batch', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
