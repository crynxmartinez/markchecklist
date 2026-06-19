'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface TransactionRecord {
  id: string
  status: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

type FieldType = 'text' | 'number' | 'date' | 'textarea' | 'select' | 'computed'

interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: string[]
  full?: boolean
}

interface Section {
  title: string
  onlyWhenCancelled?: boolean
  fields: FieldDef[]
}

const SECTIONS: Section[] = [
  {
    title: 'Status & Property',
    fields: [
      { key: 'status', label: 'Status', type: 'select', options: ['PENDING', 'CLOSED', 'CANCELLED'] },
      { key: 'side', label: 'Buyer / Seller', type: 'select', options: ['Buyer', 'Seller'] },
      { key: 'coeMonth', label: 'COE Month', type: 'text' },
      { key: 'propertyAddress', label: 'Property Address', type: 'text', full: true },
      { key: 'city', label: 'City', type: 'text' },
      { key: 'state', label: 'State', type: 'text' },
      { key: 'zipCode', label: 'Zip Code', type: 'text' },
      { key: 'county', label: 'County', type: 'text' },
    ],
  },
  {
    title: 'People',
    fields: [
      { key: 'agentName', label: 'Agent Name', type: 'text' },
      { key: 'agentPhone', label: 'Agent Phone', type: 'text' },
      { key: 'agentEmail', label: 'Agent Email', type: 'text' },
      { key: 'pm', label: 'PM (Production Manager)', type: 'text' },
      { key: 'isa', label: 'ISA', type: 'text' },
      { key: 'tc', label: 'TC (Coordinator)', type: 'text' },
      { key: 'tcEmail', label: 'TC Email', type: 'text' },
      { key: 'clientName', label: 'Client Name', type: 'text' },
      { key: 'clientPhone', label: 'Client Phone', type: 'text' },
      { key: 'clientEmail', label: 'Client Email', type: 'text' },
    ],
  },
  {
    title: 'Vendors & Other Agent',
    fields: [
      { key: 'escrowContact', label: 'Escrow / New Build Contact', type: 'text' },
      { key: 'escrowPhone', label: 'Escrow Phone', type: 'text' },
      { key: 'escrowEmail', label: 'Escrow Email', type: 'text' },
      { key: 'lender', label: 'Lender', type: 'text' },
      { key: 'lenderPhone', label: 'Lender Phone', type: 'text' },
      { key: 'lenderEmail', label: 'Lender Email', type: 'text' },
      { key: 'homeWarranty', label: 'Home Warranty', type: 'text' },
      { key: 'nhd', label: 'NHD', type: 'text' },
      { key: 'title', label: 'Title', type: 'text' },
      { key: 'otherAgentName', label: 'Other Agent Name (Non-CHT)', type: 'text' },
      { key: 'otherAgentContact', label: 'Other Agent Contact (Non-CHT)', type: 'text' },
    ],
  },
  {
    title: 'Dates & Quarters',
    fields: [
      { key: 'quarterAccepted', label: 'Quarter Accepted', type: 'text' },
      { key: 'acceptanceDate', label: 'Acceptance Date', type: 'date' },
      { key: 'contractCoe', label: 'Contract COE', type: 'date' },
      { key: 'closingDate', label: 'Closing Date', type: 'date' },
      { key: 'quarterClosed', label: 'Quarter Closed', type: 'text' },
    ],
  },
  {
    title: 'Property Details',
    fields: [
      { key: 'solar', label: 'Solar', type: 'text' },
      { key: 'hoa', label: 'HOA', type: 'text' },
      { key: 'septic', label: 'Septic', type: 'text' },
      { key: 'termite', label: 'Termite', type: 'text' },
      { key: 'contingent', label: 'Contingent to sale/purchase', type: 'text' },
      { key: 'notes', label: 'Notes', type: 'textarea', full: true },
      { key: 'uploads', label: 'Uploads', type: 'text', full: true },
    ],
  },
  {
    title: 'Financials',
    fields: [
      { key: 'leadSource', label: 'Lead Source', type: 'text' },
      { key: 'purchasePrice', label: 'Purchase Price ($)', type: 'number' },
      { key: 'commissionPct', label: 'Commission % (decimal, e.g. 0.025)', type: 'number' },
      { key: 'gci', label: 'GCI $ (auto = Price x Commission%)', type: 'computed' },
      { key: 'transactionFee', label: 'Transaction Fee', type: 'number' },
      { key: 'tcFee', label: 'TC Fee', type: 'number' },
      { key: 'adminFee', label: 'Admin Fee', type: 'number' },
      { key: 'listingAddOn', label: 'Listing Add-On', type: 'number' },
      { key: 'agentFeeCollected', label: 'Agent Fee Collected', type: 'number' },
      { key: 'additionalCollected', label: 'Additional Collected', type: 'number' },
      { key: 'additionalDeduction', label: 'Additional Deduction', type: 'number' },
      { key: 'referralAmt', label: 'Referral Amount', type: 'number' },
      { key: 'sellerAdvance', label: 'Seller Advance', type: 'number' },
      { key: 'commissionType', label: 'Commission Type', type: 'text' },
      { key: 'grossTotal', label: 'Gross Total', type: 'number' },
      { key: 'teamTotal', label: 'Team Total', type: 'number' },
      { key: 'agentEstimate', label: 'Agent Estimate', type: 'number' },
    ],
  },
  {
    title: 'Follow-up',
    fields: [
      { key: 'vaUpdate', label: 'VA: Boomtown/FUB Update', type: 'text' },
      { key: 'zillowPastSale', label: 'Zillow - Past Sale', type: 'text' },
      { key: 'reviewActionPlanSent', label: 'Review Action Plan Sent', type: 'text' },
    ],
  },
  {
    title: 'Cancellation',
    onlyWhenCancelled: true,
    fields: [
      { key: 'clientStatus', label: 'Client Status', type: 'text' },
      { key: 'dateOfCancellation', label: 'Date of Cancellation', type: 'date' },
      { key: 'cancelledBy', label: 'Cancelled By', type: 'text' },
      { key: 'reasonForCancellation', label: 'Reason for Cancellation', type: 'textarea', full: true },
    ],
  },
]

const ALL_KEYS = SECTIONS.flatMap((s) => s.fields.map((f) => f.key))

function toInputValue(value: unknown, type: FieldType): string {
  if (value === null || value === undefined) return ''
  if (type === 'date') return String(value).slice(0, 10)
  return String(value)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  transaction: TransactionRecord | null
  onSaved: () => void
}

export function TransactionDrawer({
  open,
  onOpenChange,
  transaction,
  onSaved,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(transaction)

  useEffect(() => {
    if (!open) return
    const next: Record<string, string> = {}
    for (const section of SECTIONS) {
      for (const field of section.fields) {
        next[field.key] = transaction
          ? toInputValue(transaction[field.key], field.type)
          : ''
      }
    }
    if (!transaction) next.status = 'PENDING'
    setForm(next)
  }, [open, transaction])

  const setValue = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const computedGci = useMemo(() => {
    const price = parseFloat(form.purchasePrice)
    const pct = parseFloat(form.commissionPct)
    if (Number.isFinite(price) && Number.isFinite(pct)) return price * pct
    return null
  }, [form.purchasePrice, form.commissionPct])

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      for (const key of ALL_KEYS) {
        if (key === 'gci') continue
        body[key] = form[key] ?? ''
      }
      const url = isEdit
        ? `/api/transactions/${transaction!.id}`
        : '/api/transactions'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onSaved()
        onOpenChange(false)
      } else {
        alert(data.error || 'Failed to save transaction')
      }
    } catch (error) {
      console.error('Save transaction error:', error)
      alert('Error saving transaction')
    } finally {
      setSaving(false)
    }
  }

  const status = form.status || 'PENDING'

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? 'Edit Transaction' : 'New Transaction'}
          </SheetTitle>
          <SheetDescription>
            {isEdit
              ? form.propertyAddress || 'Update transaction details'
              : 'Add a new transaction to the database'}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-6 pb-4">
            {SECTIONS.filter(
              (s) => !s.onlyWhenCancelled || status === 'CANCELLED'
            ).map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground border-b pb-1">
                  {section.title}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.map((field) => (
                    <div
                      key={field.key}
                      className={`grid gap-1.5 ${field.full ? 'col-span-2' : ''}`}
                    >
                      <Label htmlFor={`tx-${field.key}`} className="text-xs">
                        {field.label}
                      </Label>
                      {field.type === 'computed' ? (
                        <div
                          id={`tx-${field.key}`}
                          className="flex h-8 items-center rounded-lg border border-input bg-muted/40 px-2.5 text-sm text-muted-foreground"
                        >
                          {computedGci != null
                            ? computedGci.toLocaleString(undefined, {
                                maximumFractionDigits: 2,
                              })
                            : '—'}
                        </div>
                      ) : field.type === 'textarea' ? (
                        <Textarea
                          id={`tx-${field.key}`}
                          value={form[field.key] ?? ''}
                          onChange={(e) => setValue(field.key, e.target.value)}
                          rows={3}
                        />
                      ) : field.type === 'select' ? (
                        <Select
                          value={form[field.key] ?? ''}
                          onValueChange={(value) =>
                            value && setValue(field.key, value)
                          }
                        >
                          <SelectTrigger id={`tx-${field.key}`} className="w-full">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent>
                            {field.options?.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          id={`tx-${field.key}`}
                          type={
                            field.type === 'date'
                              ? 'date'
                              : field.type === 'number'
                                ? 'number'
                                : 'text'
                          }
                          value={form[field.key] ?? ''}
                          onChange={(e) => setValue(field.key, e.target.value)}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <SheetFooter>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving
                ? 'Saving...'
                : isEdit
                  ? 'Save Changes'
                  : 'Create Transaction'}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
