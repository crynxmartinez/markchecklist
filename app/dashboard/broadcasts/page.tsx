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
  ChevronDown,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

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
  title: string | null
  language: string | null
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

interface BroadcastRecipientRow {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  status: string
  error: string | null
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

const ADMIN_FILTERS: { key: keyof Recipient; label: string }[] = [
  { key: 'title', label: 'Role' },
  { key: 'language', label: 'Language' },
]

function filtersFor(audience: Audience) {
  return audience === 'ADMIN' ? ADMIN_FILTERS : FILTERS
}

export default function BroadcastsPage() {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [loading, setLoading] = useState(true)
  const [history, setHistory] = useState<Broadcast[]>([])
  const [expandedHistory, setExpandedHistory] = useState<Set<string>>(new Set())
  const [historyRecipients, setHistoryRecipients] = useState<Record<string, BroadcastRecipientRow[]>>({})
  const [historyLoading, setHistoryLoading] = useState<Set<string>>(new Set())

  const [audience, setAudience] = useState<Audience>('AGENT')
  const [channel, setChannel] = useState<Channel>('SMS')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [createMissing, setCreateMissing] = useState(true)

  const [filters, setFilters] = useState<Record<string, string>>({})
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const [sending, setSending] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [summary, setSummary] = useState<
    { sent: number; failed: number; skipped: number } | null
  >(null)
  const [sendResults, setSendResults] = useState<{ agentId?: string; name?: string; status: string; error?: string }[]>([])
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set())

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

  const toggleHistoryRow = async (id: string) => {
    setExpandedHistory((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id); return next }
      next.add(id)
      return next
    })
    if (!historyRecipients[id]) {
      setHistoryLoading((prev) => new Set(prev).add(id))
      try {
        const res = await fetch(`/api/broadcasts/${id}/recipients`)
        const data = await res.json()
        setHistoryRecipients((prev) => ({ ...prev, [id]: data.recipients || [] }))
      } catch (e) {
        console.error('Failed to load recipients', e)
      } finally {
        setHistoryLoading((prev) => { const next = new Set(prev); next.delete(id); return next })
      }
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

  const activeFilters = filtersFor(audience)

  const filterOptions = useMemo(() => {
    const opts: Record<string, string[]> = {}
    for (const { key } of activeFilters) {
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
      for (const { key } of activeFilters) {
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
  const eligible = useMemo(
    () => (createMissing ? toSend : toSend.filter((r) => r.contactId)),
    [toSend, createMissing]
  )
  const audienceLabel = audience === 'ADMIN' ? 'admin' : 'agent'

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

  const requestSend = () => {
    if (eligible.length === 0) {
      setErrorMsg('No reachable recipients selected.')
      return
    }
    setConfirmOpen(true)
  }

  const handleSend = async () => {
    setConfirmOpen(false)
    if (eligible.length === 0) return

    setSending(true)
    setSummary(null)
    setSendResults([])
    setExpandedErrors(new Set())
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
        setErrorMsg(createData.error || 'Failed to create broadcast')
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
          if (Array.isArray(data.results)) {
            setSendResults((prev) => [...prev, ...data.results])
          }
        } else {
          failed += chunk.length
          const fallback = chunk.map((r) => ({ agentId: r.id, name: r.name ?? undefined, status: 'FAILED', error: data.error || 'Batch failed' }))
          setSendResults((prev) => [...prev, ...fallback])
        }
        setProgress({ done: Math.min(i + chunk.length, eligible.length), total: eligible.length })
      }

      setSummary({ sent, failed, skipped })
      await fetchHistory()
      // Refresh recipients so newly-created GHL contact ids are reflected.
      fetchRecipients(audience)
    } catch (e) {
      console.error('Send error', e)
      setErrorMsg('Something went wrong while sending. Please try again.')
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
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">No GHL contact yet</span>
                    <span className="font-medium">
                      {needCreate.length}{' '}
                      {createMissing ? '(will create)' : '(will skip)'}
                    </span>
                  </div>
                  <div className="pl-2 border-l-2 border-muted space-y-0.5">
                    {needCreate.map((r) => (
                      <p key={r.id} className="text-xs text-muted-foreground truncate">
                        {r.name || '—'}{!r.email && !r.phone ? ' · no email or phone' : ''}
                      </p>
                    ))}
                  </div>
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
              <div className="space-y-2">
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
                {sendResults.filter((r) => r.status !== 'SENT').length > 0 && (
                  <div className="max-h-48 overflow-auto rounded-md border text-xs">
                    {sendResults.map((r, i) => {
                      if (r.status === 'SENT') return null
                      const isExpanded = expandedErrors.has(i)
                      const isFailed = r.status === 'FAILED'
                      return (
                        <div key={i} className="border-b last:border-b-0">
                          <button
                            type="button"
                            className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50"
                            onClick={() =>
                              setExpandedErrors((prev) => {
                                const next = new Set(prev)
                                if (next.has(i)) next.delete(i)
                                else next.add(i)
                                return next
                              })
                            }
                          >
                            <span className="flex items-center gap-1.5">
                              {isFailed ? (
                                <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                              ) : (
                                <MinusCircle className="h-3.5 w-3.5 shrink-0 text-gray-400" />
                              )}
                              <span className={isFailed ? 'text-red-700' : 'text-muted-foreground'}>
                                {r.name || 'Unknown'}
                              </span>
                            </span>
                            <ChevronDown
                              className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${
                                isExpanded ? 'rotate-180' : ''
                              }`}
                            />
                          </button>
                          {isExpanded && (
                            <div className="border-t bg-muted/30 px-3 py-2 text-muted-foreground">
                              {r.error || 'No details available'}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            <Button className="w-full" onClick={requestSend} disabled={!canSend}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : `Send to ${toSend.length} ${audienceLabel}(s)`}
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
            <div className="flex flex-wrap gap-2 pt-2">
              {activeFilters.map(({ key, label }) => (
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
                  {history.map((b) => {
                    const hasIssues = b.failedCount > 0 || b.skippedCount > 0
                    const isExpanded = expandedHistory.has(b.id)
                    const isLoadingRow = historyLoading.has(b.id)
                    const rowRecipients = historyRecipients[b.id] || []
                    const problemRows = rowRecipients.filter((r) => r.status !== 'SENT')
                    return (
                      <>
                        <TableRow
                          key={b.id}
                          className={hasIssues ? 'cursor-pointer hover:bg-muted/50' : ''}
                          onClick={() => hasIssues && toggleHistoryRow(b.id)}
                        >
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
                          <TableCell className="text-right">
                            <span className={b.failedCount > 0 ? 'text-red-700 font-medium' : 'text-muted-foreground'}>
                              {b.failedCount}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-muted-foreground">{b.skippedCount}</span>
                              {hasIssues && (
                                <ChevronDown
                                  className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${
                                    isExpanded ? 'rotate-180' : ''
                                  }`}
                                />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                        {isExpanded && (
                          <TableRow key={`${b.id}-detail`}>
                            <TableCell colSpan={7} className="p-0">
                              <div className="border-t bg-muted/20 px-4 py-3">
                                {isLoadingRow ? (
                                  <p className="text-xs text-muted-foreground">Loading details...</p>
                                ) : problemRows.length === 0 ? (
                                  <p className="text-xs text-muted-foreground">No details available.</p>
                                ) : (
                                  <div className="space-y-1">
                                    {problemRows.map((r) => {
                                      const isFailed = r.status === 'FAILED'
                                      return (
                                        <div key={r.id} className="flex items-start gap-2 text-xs">
                                          {isFailed ? (
                                            <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-500" />
                                          ) : (
                                            <MinusCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-400" />
                                          )}
                                          <span className={`font-medium ${
                                            isFailed ? 'text-red-700' : 'text-muted-foreground'
                                          }`}>
                                            {r.name || r.email || r.phone || 'Unknown'}
                                          </span>
                                          {r.error && (
                                            <span className="text-muted-foreground">— {r.error}</span>
                                          )}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Send confirmation */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {channel === 'SMS' ? (
                <MessageSquare className="h-5 w-5 text-primary" />
              ) : (
                <Mail className="h-5 w-5 text-primary" />
              )}
              Send {channel === 'SMS' ? 'SMS' : 'Email'}?
            </DialogTitle>
            <DialogDescription>
              You&apos;re about to send to{' '}
              <span className="font-medium text-foreground">
                {eligible.length} {audienceLabel}
                {eligible.length === 1 ? '' : 's'}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm">
            {needCreate.length > 0 && createMissing && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-800">
                {needCreate.length} new GHL contact
                {needCreate.length === 1 ? '' : 's'} will be created.
              </div>
            )}
            {willSkip > 0 && (
              <div className="rounded-lg border bg-muted/50 px-3 py-2 text-muted-foreground">
                {willSkip} selected recipient{willSkip === 1 ? '' : 's'} will be
                skipped (not reachable on {channel}).
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSend}>
              <Send className="mr-2 h-4 w-4" />
              Send now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Error notice */}
      <Dialog
        open={errorMsg !== null}
        onOpenChange={(open) => !open && setErrorMsg(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-destructive" />
              Unable to send
            </DialogTitle>
            <DialogDescription>{errorMsg}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setErrorMsg(null)}>Got it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
  for (const { key, label } of filtersFor(audience)) {
    const v = filters[key]
    if (v && v !== ALL) parts.push(`${label}=${v}`)
  }
  const base = parts.length ? `${group} (${parts.join(', ')})` : group
  return `${base} · ${count}`
}
