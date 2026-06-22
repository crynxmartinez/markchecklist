'use client'

import { useState, useEffect } from 'react'
import { Search, X, Edit } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

interface Admin {
  id: string
  title?: string
  name: string
  email: string
  phone?: string
  googleVoice?: string
  dre?: string
  dreExpiration?: string
  birthday?: string
  anniversary?: string
  language?: string
  mlsId?: string
  ghlContactId?: string
  createdAt: string
  updatedAt: string
}

const EMPTY_FORM = {
  title: '',
  name: '',
  email: '',
  phone: '',
  googleVoice: '',
  dre: '',
  dreExpiration: '',
  birthday: '',
  anniversary: '',
  language: '',
  mlsId: '',
}

export function AdminRosterTab() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [message, setMessage] = useState('')

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState(EMPTY_FORM)

  const fetchAdmins = async () => {
    try {
      const res = await fetch('/api/admins')
      const data = await res.json()
      setAdmins(data.admins || [])
    } catch (error) {
      console.error('Error fetching admins:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  const filtered = admins.filter((a) => {
    if (!searchQuery.trim()) return true
    const q = searchQuery.toLowerCase()
    return [a.name, a.email, a.phone, a.title, a.language]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(q))
  })

  const openCreate = () => {
    setEditingId(null)
    setFormData(EMPTY_FORM)
    setDialogOpen(true)
  }

  const openEdit = (admin: Admin) => {
    setEditingId(admin.id)
    setFormData({
      title: admin.title || '',
      name: admin.name || '',
      email: admin.email || '',
      phone: admin.phone || '',
      googleVoice: admin.googleVoice || '',
      dre: admin.dre || '',
      dreExpiration: admin.dreExpiration || '',
      birthday: admin.birthday || '',
      anniversary: admin.anniversary || '',
      language: admin.language || '',
      mlsId: admin.mlsId || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.email) {
      setMessage('Name and email are required')
      return
    }
    setSaving(true)
    setMessage('')
    try {
      const res = await fetch(
        editingId ? `/api/admins/${editingId}` : '/api/admins',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData),
        }
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to save admin')
      }
      const data = await res.json()
      if (editingId) {
        setAdmins((prev) =>
          prev.map((a) => (a.id === editingId ? data.admin : a))
        )
        setMessage(`Saved ${formData.name}`)
      } else {
        setAdmins((prev) =>
          [...prev, data.admin].sort((x, y) => x.name.localeCompare(y.name))
        )
        setMessage(`Added ${formData.name}`)
      }
      setDialogOpen(false)
    } catch (error) {
      console.error('Error saving admin:', error)
      setMessage(error instanceof Error ? error.message : 'Failed to save admin')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, title, language..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} admins
          </span>
          <Button size="sm" onClick={openCreate}>
            Add Admin
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">
          Loading admins...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? `No admins matching "${searchQuery}"` : 'No admins found'}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-320px)] overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Google Voice</TableHead>
                <TableHead>Language</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((admin) => (
                <TableRow key={admin.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{admin.name}</TableCell>
                  <TableCell>
                    {admin.title ? (
                      <Badge variant="outline">{admin.title}</Badge>
                    ) : (
                      'N/A'
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{admin.email}</TableCell>
                  <TableCell className="text-sm">{admin.phone || 'N/A'}</TableCell>
                  <TableCell className="text-sm">
                    {admin.googleVoice || 'N/A'}
                  </TableCell>
                  <TableCell className="text-sm">
                    {admin.language || 'N/A'}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(admin)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit Admin' : 'Add Admin'}</DialogTitle>
            <DialogDescription>
              CHT administrative staff and team member details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Title / Role</Label>
              <Input
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="e.g., Owner, TC, VA-Transaction"
              />
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Google Voice #</Label>
              <Input
                value={formData.googleVoice}
                onChange={(e) =>
                  setFormData({ ...formData, googleVoice: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Input
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>DRE License</Label>
              <Input
                value={formData.dre}
                onChange={(e) =>
                  setFormData({ ...formData, dre: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>DRE Expiration</Label>
              <Input
                value={formData.dreExpiration}
                onChange={(e) =>
                  setFormData({ ...formData, dreExpiration: e.target.value })
                }
                placeholder="e.g., 11/18/2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input
                value={formData.birthday}
                onChange={(e) =>
                  setFormData({ ...formData, birthday: e.target.value })
                }
                placeholder="e.g., February 26"
              />
            </div>
            <div className="space-y-2">
              <Label>Anniversary</Label>
              <Input
                value={formData.anniversary}
                onChange={(e) =>
                  setFormData({ ...formData, anniversary: e.target.value })
                }
                placeholder="e.g., 1/1/2016"
              />
            </div>
            <div className="space-y-2">
              <Label>MLS ID</Label>
              <Input
                value={formData.mlsId}
                onChange={(e) =>
                  setFormData({ ...formData, mlsId: e.target.value })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
