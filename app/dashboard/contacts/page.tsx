'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Users, Mail, Phone, Tag, MessageSquare, Send, Plus, Edit, Trash2, Search, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ContactDetailModal } from '@/components/contact-detail-modal'

interface Contact {
  id: string
  ghlContactId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags: string[]
  source?: string
  subAccount?: string
  dateAdded?: string
  lastUpdated?: string
  createdAt: string
  updatedAt: string
}

export default function ContactsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Contact Detail Modal state
  const [contactDetailOpen, setContactDetailOpen] = useState(false)
  const [viewingContact, setViewingContact] = useState<Contact | null>(null)

  // Messaging state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [sending, setSending] = useState(false)

  // CRUD state
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set())
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    tags: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncMessage('')
    
    try {
      const response = await fetch('/api/contacts/sync', {
        method: 'POST',
      })
      
      const data = await response.json()
      
      if (data.success) {
        setSyncMessage(data.message)
        await fetchContacts()
      } else {
        setSyncMessage(`Error: ${data.error}`)
      }
    } catch (error) {
      setSyncMessage('Failed to sync contacts')
      console.error('Sync error:', error)
    } finally {
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchContacts()
  }, [])

  // Search filtering
  const filteredContacts = contacts.filter((contact) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    const fullName = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase()
    return (
      fullName.includes(query) ||
      (contact.email?.toLowerCase().includes(query)) ||
      (contact.phone?.includes(query))
    )
  })

  // Pagination calculations
  const totalPages = Math.ceil(filteredContacts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContacts = filteredContacts.slice(startIndex, endIndex)

  const goToPage = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const openMessageDialog = (contact: Contact, type: 'sms' | 'email') => {
    setSelectedContact(contact)
    setMessageType(type)
    setMessageSubject('')
    setMessageBody('')
    setMessageDialogOpen(true)
  }

  const handleSendMessage = async () => {
    if (!selectedContact) return

    setSending(true)
    try {
      const endpoint = messageType === 'sms' ? '/api/messages/sms' : '/api/messages/email'
      const body = messageType === 'sms' 
        ? { contactId: selectedContact.ghlContactId, message: messageBody }
        : { contactId: selectedContact.ghlContactId, subject: messageSubject, message: messageBody }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()

      if (data.success) {
        alert(`${messageType.toUpperCase()} sent successfully!`)
        setMessageDialogOpen(false)
      } else {
        alert(`Failed to send ${messageType}: ${data.error}`)
      }
    } catch (error) {
      alert(`Error sending ${messageType}`)
      console.error('Send message error:', error)
    } finally {
      setSending(false)
    }
  }

  const handleCreateContact = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/contacts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Contact created successfully!')
        setCreateDialogOpen(false)
        setFormData({ firstName: '', lastName: '', email: '', phone: '', tags: '' })
        await fetchContacts()
      } else {
        alert(`Failed to create contact: ${data.error}`)
      }
    } catch (error) {
      alert('Error creating contact')
      console.error('Create contact error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleEditContact = async () => {
    if (!selectedContact) return

    setSaving(true)
    try {
      const response = await fetch(`/api/contacts/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        }),
      })

      const data = await response.json()

      if (data.success) {
        alert('Contact updated successfully!')
        setEditDialogOpen(false)
        setSelectedContacts(new Set())
        await fetchContacts()
      } else {
        alert(`Failed to update contact: ${data.error}`)
      }
    } catch (error) {
      alert('Error updating contact')
      console.error('Update contact error:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteContacts = async () => {
    if (selectedContacts.size === 0) return

    if (!confirm(`Delete ${selectedContacts.size} contact(s)? This will also delete them from GHL.`)) {
      return
    }

    try {
      const contactIds = Array.from(selectedContacts)
      for (const contactId of contactIds) {
        await fetch(`/api/contacts/${contactId}`, {
          method: 'DELETE',
        })
      }

      alert(`${selectedContacts.size} contact(s) deleted successfully!`)
      setSelectedContacts(new Set())
      await fetchContacts()
    } catch (error) {
      alert('Error deleting contacts')
      console.error('Delete contacts error:', error)
    }
  }

  const toggleContactSelection = (contactId: string) => {
    const newSelection = new Set(selectedContacts)
    if (newSelection.has(contactId)) {
      newSelection.delete(contactId)
    } else {
      newSelection.add(contactId)
    }
    setSelectedContacts(newSelection)
  }

  const openEditDialog = () => {
    if (selectedContacts.size !== 1) {
      alert('Please select exactly one contact to edit')
      return
    }

    const contactId = Array.from(selectedContacts)[0]
    const contact = contacts.find(c => c.id === contactId)
    if (!contact) return

    setSelectedContact(contact)
    setFormData({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      tags: contact.tags.join(', '),
    })
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CHT Contact Database</h1>
          <p className="text-muted-foreground">All contacts from GHL sub-accounts synced to CHT System</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Contact
          </Button>
          <Button 
            variant="outline" 
            onClick={openEditDialog}
            disabled={selectedContacts.size !== 1}
          >
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          <Button 
            variant="outline" 
            onClick={handleDeleteContacts}
            disabled={selectedContacts.size === 0}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete ({selectedContacts.size})
          </Button>
          <Button onClick={handleSync} disabled={syncing}>
            <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from GHL'}
          </Button>
        </div>
      </div>

      {syncMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{syncMessage}</p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Contacts</CardTitle>
              <CardDescription>
                All contacts synced from GoHighLevel sub-accounts
              </CardDescription>
            </div>
            {/* Search Bar */}
            <div className="relative w-[350px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value)
                  setCurrentPage(1) // Reset to first page on search
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
            <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contacts yet. Click "Sync from GHL" to import contacts.</p>
            </div>
          ) : filteredContacts.length === 0 ? (
            <div className="text-center py-8">
              <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contacts found matching "{searchQuery}"</p>
              <Button variant="link" onClick={() => setSearchQuery('')}>Clear search</Button>
            </div>
          ) : (
            <div className="max-h-[calc(100vh-280px)] overflow-auto border rounded-md">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Sub Account</TableHead>
                    <TableHead>Last Updated</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {currentContacts.map((contact) => (
                  <TableRow 
                    key={contact.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      setViewingContact(contact)
                      setContactDetailOpen(true)
                    }}
                  >
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedContacts.has(contact.id)}
                        onCheckedChange={() => toggleContactSelection(contact.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      {contact.firstName || contact.lastName
                        ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{contact.email || 'N/A'}</TableCell>
                    <TableCell>{contact.phone || 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {contact.tags.length > 0 ? (
                          contact.tags.slice(0, 3).map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">No tags</span>
                        )}
                        {contact.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{contact.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {contact.subAccount || 'N/A'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {contact.lastUpdated
                        ? new Date(contact.lastUpdated).toLocaleDateString()
                        : 'N/A'}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            openMessageDialog(contact, 'sms')
                          }}
                          disabled={!contact.phone}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            openMessageDialog(contact, 'email')
                          }}
                          disabled={!contact.email}
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
            </div>
          )}
          
          {filteredContacts.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredContacts.length)} of {filteredContacts.length} contacts
                {searchQuery && ` (filtered from ${contacts.length})`}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum
                    if (totalPages <= 5) {
                      pageNum = i + 1
                    } else if (currentPage <= 3) {
                      pageNum = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i
                    } else {
                      pageNum = currentPage - 2 + i
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => goToPage(pageNum)}
                        className="w-10"
                      >
                        {pageNum}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Message Dialog */}
      <Dialog open={messageDialogOpen} onOpenChange={setMessageDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>
              {messageType === 'sms' ? 'Send SMS' : 'Send Email'} to {selectedContact?.firstName} {selectedContact?.lastName}
            </DialogTitle>
            <DialogDescription>
              {messageType === 'sms' 
                ? `Sending to: ${selectedContact?.phone}`
                : `Sending to: ${selectedContact?.email}`
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {messageType === 'email' && (
              <div className="grid gap-2">
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                  placeholder="Enter email subject"
                />
              </div>
            )}
            <div className="grid gap-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={messageBody}
                onChange={(e) => setMessageBody(e.target.value)}
                placeholder={messageType === 'sms' ? 'Enter SMS message' : 'Enter email message'}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMessageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendMessage} disabled={sending || !messageBody || (messageType === 'email' && !messageSubject)}>
              <Send className="mr-2 h-4 w-4" />
              {sending ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Contact Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Create New Contact</DialogTitle>
            <DialogDescription>
              Add a new contact to CHT Database and sync to GHL
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateContact} disabled={saving}>
              {saving ? 'Creating...' : 'Create Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
            <DialogDescription>
              Update contact information in CHT Database and sync to GHL
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-tags">Tags (comma-separated)</Label>
              <Input
                id="edit-tags"
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="tag1, tag2, tag3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditContact} disabled={saving}>
              {saving ? 'Updating...' : 'Update Contact'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        open={contactDetailOpen}
        onOpenChange={setContactDetailOpen}
        contact={viewingContact}
        onContactUpdated={() => {
          fetchContacts()
          // Refresh the viewing contact data
          if (viewingContact) {
            const updated = contacts.find(c => c.id === viewingContact.id)
            if (updated) setViewingContact(updated)
          }
        }}
      />
    </div>
  )
}
