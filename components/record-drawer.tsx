'use client'

import { useEffect, useState } from 'react'
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

export type DrawerFieldType = 'text' | 'number' | 'date' | 'textarea' | 'select'

export interface DrawerField {
  key: string
  label: string
  type: DrawerFieldType
  options?: string[]
  full?: boolean
}

export interface DrawerSection {
  title: string
  fields: DrawerField[]
}

export interface RecordValue {
  id?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any
}

function toInputValue(value: unknown, type: DrawerFieldType): string {
  if (value === null || value === undefined) return ''
  if (type === 'date') return String(value).slice(0, 10)
  return String(value)
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  record: RecordValue | null
  onSaved: () => void
  endpoint: string
  entityLabel: string
  sections: DrawerSection[]
  primaryField?: string
  defaults?: Record<string, string>
}

export function RecordDrawer({
  open,
  onOpenChange,
  record,
  onSaved,
  endpoint,
  entityLabel,
  sections,
  primaryField,
  defaults,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(record?.id)
  const allKeys = sections.flatMap((s) => s.fields.map((f) => f.key))

  useEffect(() => {
    if (!open) return
    const next: Record<string, string> = {}
    for (const section of sections) {
      for (const field of section.fields) {
        next[field.key] = record
          ? toInputValue(record[field.key], field.type)
          : (defaults?.[field.key] ?? '')
      }
    }
    setForm(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, record])

  const setValue = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, string> = {}
      for (const key of allKeys) body[key] = form[key] ?? ''
      const url = isEdit ? `${endpoint}/${record!.id}` : endpoint
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (res.ok && data.success) {
        onSaved()
        onOpenChange(false)
      } else {
        alert(data.error || `Failed to save ${entityLabel}`)
      }
    } catch (error) {
      console.error('Save error:', error)
      alert(`Error saving ${entityLabel}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>
            {isEdit ? `Edit ${entityLabel}` : `New ${entityLabel}`}
          </SheetTitle>
          <SheetDescription>
            {isEdit && primaryField
              ? form[primaryField] || `Update ${entityLabel.toLowerCase()} details`
              : `Add a new ${entityLabel.toLowerCase()} to the database`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4">
          <div className="space-y-6 pb-4">
            {sections.map((section) => (
              <div key={section.title} className="space-y-3">
                <h3 className="border-b pb-1 text-sm font-semibold text-foreground">
                  {section.title}
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {section.fields.map((field) => (
                    <div
                      key={field.key}
                      className={`grid gap-1.5 ${field.full ? 'col-span-2' : ''}`}
                    >
                      <Label htmlFor={`f-${field.key}`} className="text-xs">
                        {field.label}
                      </Label>
                      {field.type === 'textarea' ? (
                        <Textarea
                          id={`f-${field.key}`}
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
                          <SelectTrigger id={`f-${field.key}`} className="w-full">
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
                          id={`f-${field.key}`}
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
                  : `Create ${entityLabel}`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
