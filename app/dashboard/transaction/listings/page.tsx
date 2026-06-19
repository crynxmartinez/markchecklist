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
  title: 'Listings',
  description: 'Active and archived property listings',
  endpoint: '/api/listings',
  dataKey: 'listings',
  entityLabel: 'Listing',
  statusField: 'status',
  statusTabs: ['ALL', 'ACTIVE', 'CLOSED', 'CANCELLED', 'EXPIRED'],
  searchKeys: ['address', 'listingAgent', 'clientLegalName', 'tc'],
  columns: [
    { key: 'address', label: 'Address' },
    { key: 'listingAgent', label: 'Listing Agent' },
    { key: 'status', label: 'Status', format: 'status' },
    { key: 'listingPrice', label: 'List Price', format: 'money', align: 'right' },
    { key: 'commission', label: 'Commission', format: 'number', align: 'right' },
    { key: 'listingStartDate', label: 'Start Date', format: 'date' },
    { key: 'listingExpDate', label: 'Exp Date', format: 'date' },
    { key: 'clientLegalName', label: 'Client' },
  ],
  kpis: [
    { label: 'Listings', compute: (rows) => rows.length.toLocaleString() },
    {
      label: 'Total List Value',
      compute: (rows) => money(sum(rows, 'listingPrice')),
    },
    {
      label: 'Avg List Price',
      compute: (rows) => {
        const priced = rows.filter((r) => typeof r.listingPrice === 'number')
        return priced.length
          ? money(sum(priced, 'listingPrice') / priced.length)
          : '$0'
      },
    },
    { label: 'Active', compute: (rows) => rows.filter((r) => r.status === 'ACTIVE').length.toLocaleString() },
  ],
  drawerPrimaryField: 'address',
  drawerDefaults: { status: 'ACTIVE' },
  drawerSections: [
    {
      title: 'Status & Property',
      fields: [
        { key: 'status', label: 'Status', type: 'select', options: ['ACTIVE', 'CLOSED', 'CANCELLED', 'EXPIRED'] },
        { key: 'listingServices', label: 'Listing Services', type: 'text' },
        { key: 'listingShowcase', label: 'Listing Showcase (Yes/No)', type: 'text' },
        { key: 'listingAgent', label: 'Listing Agent', type: 'text' },
        { key: 'tc', label: 'TC', type: 'text' },
        { key: 'address', label: 'Address', type: 'text', full: true },
        { key: 'signUpDown', label: 'Sign Up/Down', type: 'text' },
        { key: 'listingPrice', label: 'Listing Price ($)', type: 'number' },
      ],
    },
    {
      title: 'Dates',
      fields: [
        { key: 'listingStartDate', label: 'Listing Start Date', type: 'date' },
        { key: 'listingExpDate', label: 'Listing Exp Date', type: 'date' },
        { key: 'todaysDate', label: "Today's Date", type: 'date' },
        { key: 'takeSheetReceived', label: 'Take Sheet Received', type: 'text' },
        { key: 'daysOffMarket', label: 'Days Off Market', type: 'text' },
      ],
    },
    {
      title: 'Commission & Fees',
      fields: [
        { key: 'commission', label: 'Commission', type: 'number' },
        { key: 'agentFee', label: 'Agent Fee', type: 'text' },
        { key: 'sellerAdvance', label: 'Seller Advance', type: 'number' },
        { key: 'sellersHwOrder', label: 'Sellers HW Order', type: 'text' },
        { key: 'closingNotes', label: 'Closing Notes', type: 'textarea', full: true },
      ],
    },
    {
      title: 'Client',
      fields: [
        { key: 'trustNameOrEntity', label: 'Trust Name or Entity', type: 'text' },
        { key: 'clientLegalName', label: "Client's Legal Name", type: 'text' },
        { key: 'clientPhone', label: "Client's Phone", type: 'text' },
        { key: 'clientEmail', label: "Client's Email", type: 'text' },
      ],
    },
    {
      title: 'Cancellation / Notes',
      fields: [
        { key: 'reasonForCancellation', label: 'Reason for Cancellation', type: 'textarea', full: true },
      ],
    },
  ],
}

export default function ListingsPage() {
  return <EntityList config={config} />
}
