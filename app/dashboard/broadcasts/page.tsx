'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Megaphone,
  Search,
  X,
  MessageSquare,
  Mail,
  Send,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Recipient {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status: string | null
  coach: string | null
  leadTeam: string | null
  tc: string | null
  subscription: string | null
  source: string | null
  contactId: string | null
  hasEmail: boolean
  hasPhone: boolean
  smsReachable: boolean
  emailReachable: boolean
}

interface Broadcast {
  id: string
  channel: string
  audience: string
  subject: string | null
  message: string
  total: number
  sentCount: number
  failedCount: number
  skippedCount: number
  status: string
  createdAt: string
}

type Channel = 'SMS' | 'EMAIL'
type Audience = 'AGENT' | 'ADMIN'

const BATCH_SIZE = 5
const ALL = '__all__'

const FILTERS: { key: keyof Recipient; label: string }[] = [
  { key: 'status', label: 'Status' },
  { key: 'coach', label: 'Coach' },
  { key: 'leadTeam', label: 'Team' },
  { key: 'tc', label: 'TC' },
  { key: 'subscription', label: 'Subscription' },
]

export default function BroadcastsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<Broadcast[]>([])

  const [audience, setAudience] = useState<Audience>('AGENT')
  const [channel, setChannel] = useState<Channel>('SMS')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [createMissing, setCreateMissing] = useState(true)

  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary] = useState<
    { sent: number; failed: number; skipped: number } | null
  >(null)

  const fetchRecipients = async (aud: Audience) => {
    setLoading(true)
    try {
      const url =
        aud === 'ADMIN' ? '/api/broadcasts/admins' : '/api/broadcasts/agents'
      const res = await fetch(url)
      const data = await res.json()
      setRecipients(data.recipients || [])
    } catch (e) {
      console.error('Failed to load recipients', e)
    } finally {
      setLoading(false)
    }
  }

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/broadcasts')
      const data = await res.json()
      setHistory(data.broadcasts || [])
    } catch (e) {
      console.error('Failed to load history', e)
    }
  }

  useEffect(() => {
    fetchHistory()
  }, [])

  // Reload recipients and reset selection/filters when switching audience.
  useEffect(() => {
    fetchRecipients(audience)
    setSelected(new Set())
    setFilters({})
    setSummary(null)
  }, [audience])

  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const { key } of FILTERS) {
      const set = new Set<string>()
      for (const r of recipients) {
        const v = r[key]
        if (v) set.add(String(v))
      }
      opts[key] = Array.from(set).sort()
    }
    return opts
  }, [recipients])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recipients.filter((r) => {
      for (const { key } of FILTERS) {
        const f = filters[key]
        if (f && f !== ALL && String(r[key] ?? '') !== f) return false
      }
      if (!q) return true
      return [r.name, r.email, r.phone].some((v) =>
        String(v ?? '').toLowerCase().includes(q)
      )
    })
  }, [recipients, filters, search])

  const isEligible = (r: Recipient) =>
    channel === 'SMS' ? r.smsReachable : r.emailReachable

  // Selected recipients that can actually receive on this channel.
  const selectedRecipients = useMemo(
    () => recipients.filter((r) => selected.has(r.id)),
    [recipients, selected]
  )
  const toSend = useMemo(
    () => selectedRecipients.filter(isEligible),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedRecipients, channel]
  )
  const needCreate = useMemo(
    () => toSend.filter((r) => !r.contactId),
    [toSend]
  )
  const willSkip = selectedRecipients.length - toSend.length

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((r) => selected.has(r.id))

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) {
        filtered.forEach((r) => next.delete(r.id))
      } else {
        filtered.forEach((r) => next.add(r.id))
      }
      return next
    })
  }

  const canSend =
    !sending &&
    message.trim().length > 0 &&
    (channel === 'SMS' || subject.trim().length > 0) &&
    toSend.length > 0

  const handleSend = async () => {
    const eligible = createMissing ? toSend : toSend.filter((r) => r.contactId)
    if (eligible.length === 0) {
      alert('No reachable recipients selected.')
      return
    }
    const confirmed = window.confirm(
      `Send ${channel} to ${eligible.length} agent(s)?` +
        (needCreate.length && createMissing
          ? `\n\n${needCreate.length} new GHL contact(s) will be created.`
          : '')
    )
    if (!confirmed) return

    setSending(true)
    setSummary(null)
    setProgress({ done: 0, total: eligible.length })

    try {
      const createRes = await fetch('/api/broadcasts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel,
          subject,
          message,
          audience: describeAudience(audience, filters, eligible.length),
          total: eligible.length,
        }),
      })
      const createData = await createRes.json()
      if (!createData.success) {
        alert(createData.error || 'Failed to create broadcast')
        setSending(false)
        return
      }
      const broadcastId = createData.broadcastId

      let sent = 0
      let failed = 0
      let skipped = 0

      for (let i = 0; i < eligible.length; i += BATCH_SIZE) {
        const chunk = eligible.slice(i, i + BATCH_SIZE)
        const isLast = i + BATCH_SIZE >= eligible.length
        const res = await fetch('/api/broadcasts/send-batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            broadcastId,
            audience,
            channel,
            subject,
            message,
            createMissing,
            finalize: isLast,
            recipients: chunk.map((r) => ({
              agentId: r.id,
              name: r.name,
              email: r.email,
              phone: r.phone,
              contactId: r.contactId,
            })),
          }),
        })
        const data = await res.json()
        if (data.success) {
          sent += data.sent
          failed += data.failed
          skipped += data.skipped
        } else {
          failed += chunk.length
        }
        setProgress({ done: Math.min(i + chunk.length, eligible.length), total: eligible.length })
      }

      setSummary({ sent, failed, skipped })
      await fetchHistory()
      // Refresh recipients so newly-created GHL contact ids are reflected.
      fetchRecipients(audience)
    } catch (e) {
      console.error('Send error', e)
      alert('Error sending broadcast')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="h-7 w-7" />
        <div>
          <h1 className="text-3xl font-bold">Broadcasts</h1>
          <p className="text-muted-foreground">
            Send bulk SMS or email via GoHighLevel
          </p>
        </div>
      </div>

      <Tabs value={audience} onValueChange={(v) => setAudience(v as Audience)}>
        <TabsList>
          <TabsTrigger value="AGENT">Agents</TabsTrigger>
          <TabsTrigger value="ADMIN">Admins</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Composer */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Compose</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={channel === 'SMS' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setChannel('SMS')}
                type="button"
              >
                <MessageSquare className="mr-2 h-4 w-4" /> SMS
              </Button>
              <Button
                variant={channel === 'EMAIL' ? 'default' : 'outline'}
                className="flex-1"
                onClick={() => setChannel('EMAIL')}
                type="button"
              >
                <Mail className="mr-2 h-4 w-4" /> Email
              </Button>
            </div>

            {channel === 'EMAIL' && (
              <div className="grid gap-1.5">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Email subject"
                />
              </div>
            )}

            <div className="grid gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="message">Message</Label>
                {channel === 'SMS' && (
                  <span className="text-xs text-muted-foreground">
                    {message.length} chars · {Math.max(1, Math.ceil(message.length / 160))} SMS
                  </span>
                )}
              </div>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={8}
                placeholder={'Hi {{firstName}}, ...'}
              />
              <p className="text-xs text-muted-foreground">
                Tokens: <code>{'{{firstName}}'}</code> <code>{'{{name}}'}</code>{' '}
                are replaced per recipient.
              </p>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={createMissing}
                onCheckedChange={(c) => setCreateMissing(Boolean(c))}
              />
              Create missing GHL contacts when sending
            </label>

            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Selected</span>
                <span className="font-medium">{selectedRecipients.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Will send ({channel})</span>
                <span className="font-medium text-green-700">{toSend.length}</span>
              </div>
              {willSkip > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Not reachable on {channel}
                  </span>
                  <span className="font-medium text-amber-700">{willSkip}</span>
                </div>
              )}
              {needCreate.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">No GHL contact yet</span>
                  <span className="font-medium">
                    {needCreate.length}{' '}
                    {createMissing ? '(will create)' : '(will skip)'}
                  </span>
                </div>
              )}
            </div>

            {sending && (
              <div className="space-y-1">
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{
                      width: `${progress.total ? (progress.done / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Sending {progress.done} / {progress.total}...
                </p>
              </div>
            )}

            {summary && !sending && (
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Sent {summary.sent}
                </Badge>
                {summary.failed > 0 && (
                  <Badge className="bg-red-100 text-red-700">
                    <XCircle className="mr-1 h-3 w-3" /> Failed {summary.failed}
                  </Badge>
                )}
                {summary.skipped > 0 && (
                  <Badge className="bg-gray-200 text-gray-700">
                    <MinusCircle className="mr-1 h-3 w-3" /> Skipped {summary.skipped}
                  </Badge>
                )}
              </div>
            )}

            <Button className="w-full" onClick={handleSend} disabled={!canSend}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : `Send to ${toSend.length} agent(s)`}
            </Button>
          </CardContent>
        </Card>

        {/* Recipients */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" /> Recipients
                <Badge variant="secondary">{filtered.length}</Badge>
              </CardTitle>
              <div className="relative w-[260px] max-w-full">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search name, email, phone"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 pr-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            {audience === 'AGENT' && (
            <div className="flex flex-wrap gap-2 pt-2">
              {FILTERS.map(({ key, label }) => (
                <Select
                  key={key}
                  value={filters[key] || ALL}
                  onValueChange={(v) =>
                    v && setFilters((prev) => ({ ...prev, [key]: v as string }))
                  }
                >
                  <SelectTrigger className="h-8 w-[150px]">
                    <SelectValue placeholder={label}>
                      {(value: string) =>
                        !value || value === ALL ? `All ${label}` : value
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All {label}</SelectItem>
                    {filterOptions[key]?.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ))}
            </div>
            )}
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">
                Loading recipients...
              </div>
            ) : (
              <div className="max-h-[480px] overflow-auto rounded-md border">
                <Table>
                  <TableHeader className="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={allFilteredSelected}
                          onCheckedChange={toggleAll}
                        />
                      </TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Reach</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((r) => {
                      const eligible = isEligible(r)
                      return (
                        <TableRow
                          key={r.id}
                          className="cursor-pointer"
                          onClick={() => toggle(r.id)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <Checkbox
                              checked={selected.has(r.id)}
                              onCheckedChange={() => toggle(r.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{r.name || '—'}</div>
                            <div className="text-xs text-muted-foreground">
                              {channel === 'SMS' ? r.phone || 'no phone' : r.email || 'no email'}
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{r.status || '—'}</span>
                          </TableCell>
                          <TableCell>
                            {r.contactId ? (
                              <Badge className="bg-green-100 text-green-800">Linked</Badge>
                            ) : (
                              <Badge variant="secondary">New</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {eligible ? (
                              <CheckCircle2 className="ml-auto h-4 w-4 text-green-600" />
                            ) : (
                              <MinusCircle className="ml-auto h-4 w-4 text-muted-foreground" />
                            )}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* History */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Broadcasts</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">
              No broadcasts sent yet.
            </p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Audience</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead className="text-right">Sent</TableHead>
                    <TableHead className="text-right">Failed</TableHead>
                    <TableHead className="text-right">Skipped</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="whitespace-nowrap text-sm">
                        {new Date(b.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{b.channel}</Badge>
                      </TableCell>
                      <TableCell className="text-sm">{b.audience}</TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                        {b.subject ? `${b.subject}: ` : ''}
                        {b.message}
                      </TableCell>
                      <TableCell className="text-right text-green-700">{b.sentCount}</TableCell>
                      <TableCell className="text-right text-red-700">{b.failedCount}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{b.skippedCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function describeAudience(
  audience: Audience,
  filters: Record<string, string>,
  count: number
): string {
  const group = audience === 'ADMIN' ? 'Admins' : 'Agents'
  const parts: string[] = []
  if (audience === 'AGENT') {
    for (const { key, label } of FILTERS) {
      const v = filters[key]
      if (v && v !== ALL) parts.push(`${label}=${v}`)
    }
  }
  const base = parts.length ? `${group} (${parts.join(', ')})` : group
  return `${base} · ${count}`
}
