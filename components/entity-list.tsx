'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, Search, X, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
  RecordDrawer,
  type DrawerSection,
  type RecordValue,
} from '@/components/record-drawer'

export type ColumnFormat =
  | 'text'
  | 'money'
  | 'number'
  | 'percent'
  | 'date'
  | 'status'

export interface Column {
  key: string
  label: string
  format?: ColumnFormat
  align?: 'right'
}

export interface Kpi {
  label: string
  compute: (rows: RecordValue[]) => string
}

export interface EntityListConfig {
  title: string
  description: string
  endpoint: string
  dataKey: string
  entityLabel: string
  columns: Column[]
  searchKeys: string[]
  statusField?: string
  statusTabs?: string[]
  kpis?: Kpi[]
  drawerSections: DrawerSection[]
  drawerPrimaryField?: string
  drawerDefaults?: Record<string, string>
}

const ITEMS_PER_PAGE = 50

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: 'bg-green-100 text-green-800',
  PENDING: 'bg-amber-100 text-amber-800',
  CLOSED: 'bg-blue-100 text-blue-800',
  CANCELLED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-gray-200 text-gray-700',
}

function titleCase(s: string): string {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

function formatCell(value: unknown, format?: ColumnFormat): ReactNode {
  if (format === 'status') {
    const s = String(value || '')
    return (
      <Badge className={STATUS_STYLES[s] || 'bg-muted text-foreground'}>
        {s ? titleCase(s) : '—'}
      </Badge>
    )
  }
  if (value === null || value === undefined || value === '') return '—'
  if (format === 'money') {
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    return Number.isFinite(n)
      ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
      : '—'
  }
  if (format === 'number') {
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    return Number.isFinite(n) ? n.toLocaleString() : String(value)
  }
  if (format === 'percent') {
    const n = typeof value === 'number' ? value : parseFloat(String(value))
    return Number.isFinite(n) ? `${(n * 100).toLocaleString()}%` : String(value)
  }
  if (format === 'date') {
    const d = new Date(String(value))
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString()
  }
  return String(value)
}

export function EntityList({ config }: { config: EntityListConfig }) {
  const [rows, setRows] = useState<RecordValue[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<RecordValue | null>(null)

  const fetchRows = async () => {
    try {
      const res = await fetch(config.endpoint)
      const data = await res.json()
      setRows(data[config.dataKey] || [])
    } catch (error) {
      console.error(`Error fetching ${config.dataKey}:`, error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: rows.length }
    if (config.statusField && config.statusTabs) {
      for (const tab of config.statusTabs) if (tab !== 'ALL') c[tab] = 0
      for (const r of rows) {
        const s = String(r[config.statusField] || '')
        if (c[s] !== undefined) c[s] += 1
      }
    }
    return c
  }, [rows, config.statusField, config.statusTabs])

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return rows.filter((r) => {
      if (
        config.statusField &&
        activeTab !== 'ALL' &&
        r[config.statusField] !== activeTab
      )
        return false
      if (!query) return true
      return config.searchKeys
        .map((k) => r[k])
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(query))
    })
  }, [rows, activeTab, searchQuery, config])

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE))
  const page = Math.min(currentPage, totalPages)
  const startIndex = (page - 1) * ITEMS_PER_PAGE
  const visible = filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  const openCreate = () => {
    setEditing(null)
    setDrawerOpen(true)
  }
  const openEdit = (r: RecordValue) => {
    setEditing(r)
    setDrawerOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{config.title}</h1>
          <p className="text-muted-foreground">{config.description}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New {config.entityLabel}
        </Button>
      </div>

      {config.kpis && config.kpis.length > 0 && (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {config.kpis.map((kpi) => (
            <Card key={kpi.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {kpi.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpi.compute(filtered)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            {config.statusField && config.statusTabs ? (
              <Tabs
                value={activeTab}
                onValueChange={(v) => {
                  setActiveTab(v)
                  setCurrentPage(1)
                }}
              >
                <TabsList>
                  {config.statusTabs.map((tab) => (
                    <TabsTrigger key={tab} value={tab} className="gap-1.5">
                      {tab === 'ALL' ? 'All' : titleCase(tab)}
                      <Badge variant="secondary" className="ml-1">
                        {counts[tab] ?? 0}
                      </Badge>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            ) : (
              <div className="text-sm text-muted-foreground">
                {filtered.length} record{filtered.length === 1 ? '' : 's'}
              </div>
            )}

            <div className="relative w-[320px] max-w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
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
              Loading...
            </div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center">
              <Inbox className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
              <p className="text-muted-foreground">
                No records yet. Click &quot;New {config.entityLabel}&quot; to add
                one.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground">
              No records match your filters.
            </div>
          ) : (
            <div className="max-h-[calc(100vh-420px)] overflow-auto rounded-md border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    {config.columns.map((col) => (
                      <TableHead
                        key={col.key}
                        className={col.align === 'right' ? 'text-right' : ''}
                      >
                        {col.label}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow
                      key={r.id}
                      className="cursor-pointer"
                      onClick={() => openEdit(r)}
                    >
                      {config.columns.map((col, idx) => (
                        <TableCell
                          key={col.key}
                          className={`${col.align === 'right' ? 'text-right' : ''} ${idx === 0 ? 'font-medium' : ''}`}
                        >
                          {formatCell(r[col.key], col.format)}
                        </TableCell>
                      ))}
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

      <RecordDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        record={editing}
        onSaved={fetchRows}
        endpoint={config.endpoint}
        entityLabel={config.entityLabel}
        sections={config.drawerSections}
        primaryField={config.drawerPrimaryField}
        defaults={config.drawerDefaults}
      />
    </div>
  )
}
