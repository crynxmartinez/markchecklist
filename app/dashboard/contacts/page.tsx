'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Users, Mail, Phone, Tag, MessageSquare, Send } from 'lucide-react'
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
  
  // Messaging state
  const [messageDialogOpen, setMessageDialogOpen] = useState(false)
  const [messageType, setMessageType] = useState<'sms' | 'email'>('sms')
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [messageSubject, setMessageSubject] = useState('')
  const [messageBody, setMessageBody] = useState('')
  const [sending, setSending] = useState(false)

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

  // Pagination calculations
  const totalPages = Math.ceil(contacts.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentContacts = contacts.slice(startIndex, endIndex)

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">CHT Contact Database</h1>
          <p className="text-muted-foreground">All contacts from GHL sub-accounts synced to CHT System</p>
        </div>
        <Button onClick={handleSync} disabled={syncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync from GHL'}
        </Button>
      </div>

      {syncMessage && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <p className="text-sm text-green-800">{syncMessage}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{contacts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter((c) => c.email).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">With Phone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {contacts.filter((c) => c.phone).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts</CardTitle>
          <CardDescription>
            All contacts synced from GoHighLevel sub-accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading contacts...</div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-8">
              <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No contacts yet. Click "Sync from GHL" to import contacts.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tags</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Sub Account</TableHead>
                  <TableHead>Last Updated</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {currentContacts.map((contact) => (
                  <TableRow key={contact.id}>
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
                    <TableCell>{contact.source || 'N/A'}</TableCell>
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
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMessageDialog(contact, 'sms')}
                          disabled={!contact.phone}
                        >
                          <MessageSquare className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openMessageDialog(contact, 'email')}
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
          )}
          
          {contacts.length > 0 && (
            <div className="flex items-center justify-between px-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, contacts.length)} of {contacts.length} contacts
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
    </div>
  )
}
