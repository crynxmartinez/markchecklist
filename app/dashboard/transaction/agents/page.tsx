'use client'

import { EntityList, type EntityListConfig } from '@/components/entity-list'

const config: EntityListConfig = {
  title: 'Agents',
  description: 'Agent contracts and onboarding',
  endpoint: '/api/agent-contracts',
  dataKey: 'agents',
  entityLabel: 'Agent',
  searchKeys: ['agentName', 'productionManager', 'source'],
  columns: [
    { key: 'agentName', label: 'Agent' },
    { key: 'soi', label: 'SOI', format: 'percent', align: 'right' },
    { key: 'productionManager', label: 'PM' },
    { key: 'chtContractSigned', label: 'Contract Signed', format: 'date' },
    { key: 'anniversaryDate', label: 'Anniversary', format: 'date' },
    { key: 'fubAccount', label: 'FUB' },
    { key: 'source', label: 'Source' },
  ],
  kpis: [
    { label: 'Agents', compute: (rows) => rows.length.toLocaleString() },
    {
      label: 'Avg SOI Split',
      compute: (rows) => {
        const valid = rows.filter((r) => typeof r.soi === 'number')
        if (!valid.length) return '—'
        const avg = valid.reduce((a, r) => a + r.soi, 0) / valid.length
        return `${(avg * 100).toFixed(0)}%`
      },
    },
  ],
  drawerPrimaryField: 'agentName',
  drawerSections: [
    {
      title: 'Agent',
      fields: [
        { key: 'agentName', label: 'Agent Name', type: 'text' },
        { key: 'soi', label: 'SOI (decimal, e.g. 0.9)', type: 'number' },
        { key: 'productionManager', label: 'Production Manager', type: 'text' },
        { key: 'referralAgent', label: 'Referral Agent', type: 'text' },
        { key: 'source', label: 'Source', type: 'text' },
      ],
    },
    {
      title: 'Contract Dates',
      fields: [
        { key: 'chtContractSent', label: 'CHT Contract Sent', type: 'date' },
        { key: 'chtContractSigned', label: 'CHT Contract Signed', type: 'date' },
        { key: 'chtContractEffective', label: 'CHT Contract Effective', type: 'date' },
        { key: 'anniversaryDate', label: 'Anniversary Date', type: 'date' },
        { key: 'dateToReviewSoiSplit', label: 'Date to Review SOI Split', type: 'date' },
        { key: 'dateOnboardingCompleted', label: 'Date Onboarding Completed', type: 'date' },
      ],
    },
    {
      title: 'Onboarding',
      fields: [
        { key: 'expContractSigned', label: 'eXp Contract Signed', type: 'text' },
        { key: 'soiCap', label: 'SOI CAP', type: 'text' },
        { key: 'dateAssignedToPm', label: 'Date Assigned to PM', type: 'text' },
        { key: 'eaProgramAssignedDate', label: 'EA Program Assigned Date', type: 'text' },
        { key: 'transactionsPaidEa', label: '# Transactions Paid (EA)', type: 'text' },
        { key: 'tcServicesSubscribedDate', label: 'TC Services Subscribed Date', type: 'text' },
        { key: 'fubAccount', label: 'FUB Account', type: 'text' },
        { key: 'disc', label: 'DISC', type: 'text' },
      ],
    },
    {
      title: 'Billing & Notes',
      fields: [
        { key: 'adminBill', label: 'Admin Bill (reimbursement)', type: 'text' },
        { key: 'zillowAccountabilityAgreement', label: 'Zillow Accountability Agreement', type: 'text' },
        { key: 'payNotes', label: 'Pay Notes', type: 'textarea', full: true },
      ],
    },
  ],
}

export default function TransactionAgentsPage() {
  return <EntityList config={config} />
}
