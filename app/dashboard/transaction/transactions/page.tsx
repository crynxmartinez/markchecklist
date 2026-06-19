'use client'

import { useEffect, useMemo, useState } from 'react'
import { Plus, Search, X, Receipt } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TransactionDrawer,
  type TransactionRecord,
} from '@/components/transaction-drawer'

const STATUS_TABS = ['ALL', 'PENDING', 'CLOSED', 'CANCELLED'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const ITEMS_PER_PAGE = 50

function formatMoney(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—'
  const n = typeof value === 'number' ? value : parseFloat(String(value))
  if (!Number.isFinite(n)) return '—'
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

function formatDate(value: unknown): string {
  if (!value) return '—'
  const d = new Date(String(value))
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    PENDING: 'bg-amber-100 text-amber-800',
    CLOSED: 'bg-green-100 text-green-800',
    CANCELLED: 'bg-red-100 text-red-700',
  }
  const label =
    status.charAt(0) + status.slice(1).toLowerCase()
  return (
    <Badge className={styles[status] || 'bg-muted text-foreground'}>
      {label}
    </Badge>
  )
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<TransactionRecord | null>(null)

  const fetchTransactions = async () => {
    try {
      const res = await fetch('/api/transactions')
      const data = await res.json()
      setTransactions(data.transactions || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = {
      ALL: transactions.length,
      PENDING: 0,
      CLOSED: 0,
      CANCELLED: 0,
    }
    for (const t of transactions) {
      if (c[t.status] !== undefined) c[t.status] += 1
    }
    return c
  }, [transactions])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return transactions.filter((t) => {
      if (activeTab !== 'ALL' && t.status !== activeTab) return false
      if (!query) return true
      return [t.propertyAddress, t.clientName, t.agentName, t.city]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query))
    })
  }, [transactions, activeTab, searchQuery])

  const kpis = useMemo(() => {
    let gci = 0
    let team = 0
    let priceSum = 0
    let priceCount = 0
    for (const t of filtered) {
      if (typeof t.gci === 'number') gci += t.gci
      if (typeof t.teamTotal === 'number') team += t.teamTotal
      if (typeof t.purchasePrice === 'number') {
        priceSum += t.purchasePrice
        priceCount += 1
      }
    }
    return {
      gci,
      team,
      count: filtered.length,
      avgPrice: priceCount ? priceSum / priceCount : 0,
    }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const visible = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }

  const openEdit = (t: TransactionRecord) => {
    setEditing(t)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Transactions</h1>
          <p className="text-muted-foreground">
            Track pending, closed, and cancelled deals
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total GCI
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis.gci)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Team Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatMoney(kpis.team)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Deal Count
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.count}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Purchase Price
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatMoney(kpis.avgPrice)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={activeTab}
              onValueChange={(v) => {
                setActiveTab(v as StatusTab)
                setCurrentPage(1)
              }}
            >
              <TabsList>
                {STATUS_TABS.map((tab) => (
                  <TabsTrigger key={tab} value={tab} className="gap-1.5">
                    {tab === 'ALL'
                      ? 'All'
                      : tab.charAt(0) + tab.slice(1).toLowerCase()}
                    <Badge variant="secondary" className="ml-1">
                      {counts[tab] ?? 0}
                    </Badge>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>

            <div className="relative w-[320px] max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search address, client, or agent..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1)
                }}
                className="pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => {
                    setSearchQuery('')
                    setCurrentPage(1)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground">
              Loading transactions...
            </div>
          ) : transactions.length === 0 ? (
            <div className="py-12 text-center">
              <Receipt className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No transactions yet. Click "New Transaction" to add one.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No transactions match your filters.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-420px)] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead>Property Address</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Agent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Purchase Price</TableHead>
                    <TableHead className="text-right">GCI</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>Quarter</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(t)}
                    >
                      <TableCell className="font-medium">
                        {t.propertyAddress || '—'}
                      </TableCell>
                      <TableCell>{t.clientName || '—'}</TableCell>
                      <TableCell>{t.agentName || '—'}</TableCell>
                      <TableCell>
                        <StatusBadge status={t.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(t.purchasePrice)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatMoney(t.gci)}
                      </TableCell>
                      <TableCell>{formatDate(t.closingDate)}</TableCell>
                      <TableCell>{t.quarterClosed || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {filtered.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to{' '}
                {Math.min(startIndex + ITEMS_PER_PAGE, filtered.length)} of{' '}
                {filtered.length}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(page - 1)}
                  disabled={page === 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        transaction={editing}
        onSaved={fetchTransactions}
      />
    </div>
  )
}
