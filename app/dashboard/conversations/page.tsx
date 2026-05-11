'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Search, Mail, Phone, User } from 'lucide-react'

interface Contact {
  id: string
  ghlContactId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags: string[]
}

interface Message {
  id: string
  body: string
  type: number
  direction: string
  status: string
  dateAdded: string
  meta?: {
    email?: {
      subject?: string
    }
  }
}

interface Conversation {
  id: string
  contactId: string
  type: string
  lastMessageBody?: string
  lastMessageDate?: string
  fullName?: string
  email?: string
  phone?: string
  messages: Message[]
}

export default function ConversationsPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchContacts()
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [conversations])

  const fetchContacts = async () => {
    try {
      const res = await fetch('/api/contacts')
      const data = await res.json()
      setContacts(data.contacts || [])
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchConversations = async (contactId: string) => {
    setLoadingConversations(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/conversations`)
      const data = await res.json()
      console.log('Conversations response:', data)
      if (data.error) {
        console.error('API Error:', data.error)
      }
      if (data.debug) {
        console.log('Debug info:', data.debug)
      }
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
      setConversations([])
    } finally {
      setLoadingConversations(false)
    }
  }

  const handleSelectContact = (contact: Contact) => {
    setSelectedContact(contact)
    setConversations([])
    fetchConversations(contact.id)
  }

  const filteredContacts = contacts.filter(contact => {
    const name = `${contact.firstName || ''} ${contact.lastName || ''}`.toLowerCase()
    const email = (contact.email || '').toLowerCase()
    const phone = (contact.phone || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || email.includes(query) || phone.includes(query)
  })

  const getContactName = (contact: Contact) => {
    if (contact.firstName || contact.lastName) {
      return `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    }
    return contact.email || contact.phone || 'Unknown'
  }

  const getInitials = (contact: Contact) => {
    const name = getContactName(contact)
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const allMessages = conversations.flatMap(conv => 
    conv.messages.map(msg => ({ ...msg, conversationType: conv.type }))
  ).sort((a, b) => new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime())

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Panel - Contact List */}
      <div className="w-80 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b">
          <h1 className="text-xl font-bold mb-3">Conversations</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search contacts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading contacts...</p>
          ) : filteredContacts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No contacts found</p>
          ) : (
            <div className="divide-y">
              {filteredContacts.slice(0, 100).map((contact) => (
                <button
                  key={contact.id}
                  onClick={() => handleSelectContact(contact)}
                  className={`w-full p-3 text-left hover:bg-muted transition-colors ${
                    selectedContact?.id === contact.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {getInitials(contact)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{getContactName(contact)}</p>
                      {contact.email && (
                        <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Conversation View */}
      <div className="flex-1 flex flex-col">
        {!selectedContact ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a contact to view conversations</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {getInitials(selectedContact)}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">{getContactName(selectedContact)}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {selectedContact.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedContact.email}
                    </span>
                  )}
                  {selectedContact.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedContact.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
              {loadingConversations ? (
                <p className="text-center text-muted-foreground py-8">Loading conversations...</p>
              ) : allMessages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No conversations found</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {allMessages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-lg px-4 py-2 ${
                          msg.direction === 'outbound'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-white border'
                        }`}
                      >
                        {msg.meta?.email?.subject && (
                          <p className={`text-xs font-medium mb-1 ${
                            msg.direction === 'outbound' ? 'opacity-80' : 'text-muted-foreground'
                          }`}>
                            Subject: {msg.meta.email.subject}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                        <div className={`flex items-center gap-2 mt-1 text-xs ${
                          msg.direction === 'outbound' ? 'opacity-70' : 'text-muted-foreground'
                        }`}>
                          <span>{new Date(msg.dateAdded).toLocaleString()}</span>
                          <Badge variant={msg.direction === 'outbound' ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0">
                            {msg.type === 1 ? 'SMS' : msg.type === 2 ? 'Email' : 'Message'}
                          </Badge>
                          {msg.direction === 'outbound' && (
                            <span>
                              {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer - Placeholder for future send functionality */}
            <div className="p-4 border-t bg-background">
              <p className="text-sm text-muted-foreground text-center">
                View-only mode • Messages are synced from GoHighLevel
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
