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
  title: 'Referrals',
  description: 'Referral deals and referral fees',
  endpoint: '/api/referrals',
  dataKey: 'referrals',
  entityLabel: 'Referral',
  searchKeys: ['agentName', 'recipientAgent', 'propertyAddress', 'principal'],
  columns: [
    { key: 'agentName', label: 'Agent' },
    { key: 'recipientAgent', label: 'Recipient Agent' },
    { key: 'referralType', label: 'Type' },
    { key: 'rfaStatus', label: 'RFA Status' },
    { key: 'propertyAddress', label: 'Property' },
    { key: 'referralAmount', label: 'Referral Amt', format: 'money', align: 'right' },
    { key: 'gci', label: 'GCI', format: 'money', align: 'right' },
  ],
  kpis: [
    { label: 'Referrals', compute: (rows) => rows.length.toLocaleString() },
    { label: 'Total Referral $', compute: (rows) => money(sum(rows, 'referralAmount')) },
    { label: 'Total GCI', compute: (rows) => money(sum(rows, 'gci')) },
    { label: 'Total Team', compute: (rows) => money(sum(rows, 'teamTotal')) },
  ],
  drawerPrimaryField: 'agentName',
  drawerSections: [
    {
      title: 'Referral Info',
      fields: [
        { key: 'referralType', label: 'Referral Type', type: 'text' },
        { key: 'dealType', label: 'Type', type: 'text' },
        { key: 'side', label: 'Seller / Buyer', type: 'text' },
        { key: 'rfaStatus', label: 'RFA Status', type: 'text' },
        { key: 'leadSource', label: 'Lead Source', type: 'text' },
      ],
    },
    {
      title: 'Property',
      fields: [
        { key: 'propertyAddress', label: 'Property Address', type: 'text', full: true },
        { key: 'city', label: 'City', type: 'text' },
        { key: 'zipCode', label: 'Zip Code', type: 'text' },
        { key: 'county', label: 'County', type: 'text' },
      ],
    },
    {
      title: 'People',
      fields: [
        { key: 'agentName', label: 'Agent Name', type: 'text' },
        { key: 'isa', label: 'ISA', type: 'text' },
        { key: 'am', label: 'AM', type: 'text' },
        { key: 'principal', label: 'Principal', type: 'text' },
        { key: 'clientPhone', label: 'Client Phone', type: 'text' },
        { key: 'clientEmail', label: 'Client Email', type: 'text' },
        { key: 'recipientAgent', label: 'Recipient Agent', type: 'text' },
        { key: 'recipientAgentBroker', label: 'Recipient Agent Broker', type: 'text' },
      ],
    },
    {
      title: 'Dates',
      fields: [
        { key: 'acceptanceDate', label: 'Acceptance Date', type: 'date' },
        { key: 'contractClosedDate', label: 'Contract Closed Date', type: 'date' },
        { key: 'actualClosingDate', label: 'Actual Closing Date', type: 'date' },
      ],
    },
    {
      title: 'Financials',
      fields: [
        { key: 'purchasePrice', label: 'Purchase Price ($)', type: 'number' },
        { key: 'commission', label: 'Commission ($ or %)', type: 'text' },
        { key: 'gci', label: 'GCI $', type: 'number' },
        { key: 'referralAmount', label: 'Referral Amount', type: 'number' },
        { key: 'commissionType', label: 'Commission Type', type: 'text' },
        { key: 'grossTotal', label: 'Gross Total', type: 'number' },
        { key: 'teamTotal', label: 'Team Total', type: 'number' },
        { key: 'agentEstimate', label: 'Agent Estimate', type: 'number' },
        { key: 'commissionAdjustments', label: 'Commission Adjustments', type: 'text' },
        { key: 'agentCommission', label: 'Agent Commission', type: 'number' },
        { key: 'escrowDisbursement', label: 'Escrow Disbursement', type: 'number' },
      ],
    },
  ],
}

export default function ReferralsPage() {
  return <EntityList config={config} />
}
