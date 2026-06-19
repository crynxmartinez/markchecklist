'use client'

import { EntityList, type EntityListConfig } from '@/components/entity-list'
import type { RecordValue } from '@/components/record-drawer'

function sum(rows: RecordValue[], key: string): number {
  return rows.reduce((acc, r) => acc + (typeof r[key] === 'number' ? r[key] : 0), 0)
}
function money(n: number): string {
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
}

const config: EntityListConfig = {
  title: 'Reimbursements',
  description: 'Agent reimbursement tracking',
  endpoint: '/api/reimbursements',
  dataKey: 'reimbursements',
  entityLabel: 'Reimbursement',
  searchKeys: ['agent', 'listing', 'item', 'notes'],
  columns: [
    { key: 'agent', label: 'Agent' },
    { key: 'listing', label: 'Listing' },
    { key: 'item', label: 'Item' },
    { key: 'amount', label: 'Amount', format: 'money', align: 'right' },
    { key: 'status', label: 'Status' },
    { key: 'notes', label: 'Notes' },
  ],
  kpis: [
    { label: 'Reimbursements', compute: (rows) => rows.length.toLocaleString() },
    { label: 'Total Amount', compute: (rows) => money(sum(rows, 'amount')) },
  ],
  drawerPrimaryField: 'item',
  drawerSections: [
    {
      title: 'Reimbursement',
      fields: [
        { key: 'agent', label: 'Agent', type: 'text' },
        { key: 'status', label: 'Status', type: 'text' },
        { key: 'listing', label: 'Listing', type: 'text', full: true },
        { key: 'item', label: 'Item', type: 'text' },
        { key: 'amount', label: 'Amount ($)', type: 'number' },
        { key: 'notes', label: 'Notes', type: 'textarea', full: true },
      ],
    },
  ],
}

export default function ReimbursementsPage() {
  return <EntityList config={config} />
}
