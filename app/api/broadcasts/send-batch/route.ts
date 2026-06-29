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

// Normalises a phone number for GHL.
// - Already E.164 (+XXXXXXXXX) → pass through as-is
// - 10 US digits → +1XXXXXXXXXX
// - 11 digits starting with 1 → +1XXXXXXXXXX
// - Anything else (international without +, etc.) → undefined (skip)
function toE164(phone?: string | null): string | undefined {
  if (!phone) return undefined
  const trimmed = phone.trim()
  // Already has a + — treat as international E.164, keep as-is
  if (trimmed.startsWith('+')) return trimmed.replace(/\s/g, '')
  const digits = trimmed.replace(/\D/g, '')
  if (digits.length === 10) return `+1${digits}`
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`
  return undefined
}

// Converts a raw GHL error message into a short, user-friendly reason.
function parseSendError(raw: string): string {
  if (raw.includes('DND_ACTIVE') || raw.includes('DND is active')) return 'DND active — contact has opted out of SMS'
  if (raw.includes('NO_PHONE') || raw.includes('Missing phone number')) return 'No phone number on GHL contact'
  if (raw.includes('NO_EMAIL') || raw.includes('Missing email')) return 'No email address on GHL contact'
  if (raw.includes('INVALID_PHONE') || raw.includes('invalid phone')) return 'Invalid phone number format'
  if (raw.includes('401') || raw.includes('Unauthorized')) return 'GHL API key unauthorized'
  if (raw.includes('429') || raw.includes('Too Many Requests')) return 'Rate limited by GHL — try again later'
  if (raw.includes('500') || raw.includes('Internal Server')) return 'GHL server error'
  return 'Send failed'
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
      audience,
      channel,
      subject,
      message,
      createMissing,
      finalize,
      recipients,
    } = body as {
      broadcastId: string
      audience?: 'AGENT' | 'ADMIN'
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
      const e164Phone = toE164(r.phone)

      // Always upsert the GHL contact when we have identifying info.
      // This ensures GHL has the latest phone+email on the GHL contact.
      // We upsert when we have at least an email or phone to identify the contact.
      const shouldUpsert = (r.email || e164Phone) && (createMissing || contactId)
      if (shouldUpsert) {
        try {
          const [firstName, ...rest] = (r.name || '').trim().split(/\s+/)
          const contact = await upsertGHLContact({
            firstName: firstName || undefined,
            lastName: rest.join(' ') || undefined,
            email: r.email || undefined,
            phone: e164Phone,
            source: 'CHT Broadcast',
            locationId,
            apiKey,
          })
          const resolvedId = contact?.id || null
          if (resolvedId) {
            contactId = resolvedId
            // Cache the resolved id on the source record for next time.
            if (r.agentId) {
              if (audience === 'ADMIN') {
                await prisma.admin
                  .update({ where: { id: r.agentId }, data: { ghlContactId: resolvedId } })
                  .catch(() => undefined)
              } else {
                await prisma.agent
                  .update({ where: { id: r.agentId }, data: { ghlContactId: resolvedId } })
                  .catch(() => undefined)
              }
            }
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
        const rawMsg = err instanceof Error ? err.message : 'Unknown error'
        const friendlyMsg = parseSendError(rawMsg)
        // DND is an expected opt-out — count as skipped not failed
        const isDnd = rawMsg.includes('DND_ACTIVE') || rawMsg.includes('DND is active')
        const recipientStatus = isDnd ? 'SKIPPED' : 'FAILED'
        if (isDnd) skipped++; else failed++
        results.push({ agentId: r.agentId, name: r.name, status: recipientStatus, error: friendlyMsg })
        await prisma.broadcastRecipient.create({
          data: {
            broadcastId,
            agentId: r.agentId,
            name: r.name,
            email: r.email,
            phone: r.phone,
            contactId,
            status: recipientStatus,
            error: friendlyMsg,
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
