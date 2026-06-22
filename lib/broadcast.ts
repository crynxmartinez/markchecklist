import { prisma } from '@/lib/prisma'

// Last 10 digits, so different formats of the same number match.
export function normalizePhone(s?: string | null): string {
  return s ? s.replace(/\D/g, '').slice(-10) : ''
}

export interface ContactIndex {
  byEmail: Map<string, string>
  byPhone: Map<string, string>
}

// Loads the synced GHL contacts and indexes them by email and phone so we can
// resolve an agent to an existing GHL contactId without extra API calls.
export async function buildContactIndex(): Promise<ContactIndex> {
  const contacts = await prisma.contact.findMany({
    select: { email: true, phone: true, ghlContactId: true },
  })
  const byEmail = new Map<string, string>()
  const byPhone = new Map<string, string>()
  for (const c of contacts) {
    if (c.email) {
      const k = c.email.toLowerCase().trim()
      if (!byEmail.has(k)) byEmail.set(k, c.ghlContactId)
    }
    if (c.phone) {
      const k = normalizePhone(c.phone)
      if (k && !byPhone.has(k)) byPhone.set(k, c.ghlContactId)
    }
  }
  return { byEmail, byPhone }
}

export interface ResolvableAgent {
  ghlContactId?: string | null
  email?: string | null
  phone?: string | null
}

export function resolveContactId(
  agent: ResolvableAgent,
  idx: ContactIndex
): string | null {
  if (agent.ghlContactId) return agent.ghlContactId
  if (agent.email) {
    const v = idx.byEmail.get(agent.email.toLowerCase().trim())
    if (v) return v
  }
  if (agent.phone) {
    const v = idx.byPhone.get(normalizePhone(agent.phone))
    if (v) return v
  }
  return null
}

// Replaces personalization tokens like {{firstName}} in a template.
export function personalize(
  template: string,
  agent: { name?: string | null }
): string {
  const name = (agent.name || '').trim()
  const firstName = name.split(/\s+/)[0] || ''
  return (template || '')
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*(name|agentName)\s*\}\}/gi, name)
}
