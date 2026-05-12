'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Search, Mail, Phone, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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

interface ConversationItem {
  id: string
  contactId: string
  contactName: string
  email?: string
  phone?: string
  lastMessageBody?: string
  lastMessageDate?: string
  type: string
  unreadCount?: number
}

interface ConversationWithMessages {
  id: string
  type: string
  messages: Message[]
}

export default function ConversationsPage() {
  const [conversationsList, setConversationsList] = useState<ConversationItem[]>([])
  const [selectedConversation, setSelectedConversation] = useState<ConversationItem | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all')
  const [readConversationIds, setReadConversationIds] = useState<Set<string>>(new Set())
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversationsList()
    fetchReadStatus()
  }, [])

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const fetchConversationsList = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/conversations')
      const data = await res.json()
      setConversationsList(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchReadStatus = async () => {
    try {
      const res = await fetch('/api/conversations/read-status')
      const data = await res.json()
      setReadConversationIds(new Set(data.readIds || []))
    } catch (error) {
      console.error('Error fetching read status:', error)
    }
  }

  const markAsRead = async (conversationId: string) => {
    try {
      await fetch(`/api/conversations/${conversationId}/read`, { method: 'POST' })
      setReadConversationIds(prev => new Set([...Array.from(prev), conversationId]))
    } catch (error) {
      console.error('Error marking as read:', error)
    }
  }

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    console.log('Fetching messages for:', conversationId)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      const data = await res.json()
      console.log('Messages response:', data)
      console.log('First message sample:', data.messages?.[0])
      if (data.error) {
        console.error('API error:', data.error)
      }
      setMessages(data.messages || [])
    } catch (error) {
      console.error('Error fetching messages:', error)
      setMessages([])
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleSelectConversation = (conv: ConversationItem) => {
    setSelectedConversation(conv)
    setMessages([])
    fetchMessages(conv.id)
    // Mark as read in our system
    if (!readConversationIds.has(conv.id)) {
      markAsRead(conv.id)
    }
  }

  const filteredConversations = conversationsList.filter(conv => {
    // Filter by read/unread status (using our system, not GHL)
    const isRead = readConversationIds.has(conv.id)
    if (filter === 'unread' && isRead) return false
    if (filter === 'read' && !isRead) return false
    
    // Filter by search query (name, email, phone)
    if (searchQuery) {
      const name = (conv.contactName || '').toLowerCase()
      const email = (conv.email || '').toLowerCase()
      const phone = (conv.phone || '').toLowerCase()
      const query = searchQuery.toLowerCase()
      return name.includes(query) || email.includes(query) || phone.includes(query)
    }
    
    return true
  })

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) || dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    
    if (days === 0) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    if (days === 1) return 'Yesterday'
    if (days < 7) return date.toLocaleDateString([], { weekday: 'short' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex">
      {/* Left Panel - Conversations List */}
      <div className="w-96 border-r flex flex-col bg-muted/30">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold">Conversations</h1>
            <Button variant="ghost" size="sm" onClick={fetchConversationsList} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, or phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          
          {/* Filter Tabs */}
          <div className="flex gap-1 mt-3">
            <Button
              variant={filter === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('all')}
              className="flex-1 h-8 text-xs"
            >
              All
            </Button>
            <Button
              variant={filter === 'unread' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('unread')}
              className="flex-1 h-8 text-xs"
            >
              Unread
            </Button>
            <Button
              variant={filter === 'read' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFilter('read')}
              className="flex-1 h-8 text-xs"
            >
              Read
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading conversations from GHL...</p>
          ) : filteredConversations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No conversations found</p>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => {
                const isRead = readConversationIds.has(conv.id)
                return (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-3 text-left hover:bg-muted transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-muted' : ''
                  } ${!isRead ? 'bg-blue-50' : ''}`}
                >
                  <div className="flex items-start gap-3">
                    {/* Unread indicator dot */}
                    <div className="relative">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-primary">
                          {getInitials(conv.contactName || 'Unknown')}
                        </span>
                      </div>
                      {!isRead && (
                        <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className={`text-sm truncate ${!isRead ? 'font-semibold' : 'font-medium'}`}>
                          {conv.contactName || 'Unknown'}
                        </p>
                        {conv.lastMessageDate && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDate(conv.lastMessageDate)}
                          </span>
                        )}
                      </div>
                      <p className={`text-xs truncate mt-0.5 ${!isRead ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                        {conv.lastMessageBody || 'No messages'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {conv.type === 'TYPE_PHONE' ? 'SMS' : conv.type === 'TYPE_EMAIL' ? 'Email' : conv.type}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Messages View */}
      <div className="flex-1 flex flex-col">
        {!selectedConversation ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a conversation to view messages</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-primary">
                  {getInitials(selectedConversation.contactName || 'Unknown')}
                </span>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold">{selectedConversation.contactName || 'Unknown'}</h2>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {selectedConversation.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {selectedConversation.email}
                    </span>
                  )}
                  {selectedConversation.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedConversation.phone}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-muted/20">
              {loadingMessages ? (
                <p className="text-center text-muted-foreground py-8">Loading messages...</p>
              ) : messages.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No messages found</p>
                </div>
              ) : (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {messages.map((msg: any) => {
                    // Handle different GHL field names
                    const isOutbound = msg.direction === 'outbound' || msg.direction === 1
                    const messageBody = msg.body || msg.message || msg.text || msg.content || ''
                    const messageDate = msg.dateAdded || msg.createdAt || msg.timestamp || msg.date
                    const messageType = msg.type || msg.messageType || 'SMS'
                    
                    // Parse date - could be timestamp or ISO string
                    let dateDisplay = ''
                    if (messageDate) {
                      const timestamp = parseInt(messageDate)
                      const date = !isNaN(timestamp) ? new Date(timestamp) : new Date(messageDate)
                      dateDisplay = !isNaN(date.getTime()) ? date.toLocaleString() : ''
                    }
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[70%] rounded-lg px-4 py-2 ${
                            isOutbound
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-white border'
                          }`}
                        >
                          {msg.meta?.email?.subject && (
                            <p className={`text-xs font-medium mb-1 ${
                              isOutbound ? 'opacity-80' : 'text-muted-foreground'
                            }`}>
                              Subject: {msg.meta.email.subject}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap">{messageBody}</p>
                          <div className={`flex items-center gap-2 mt-1 text-xs ${
                            isOutbound ? 'opacity-70' : 'text-muted-foreground'
                          }`}>
                            {dateDisplay && <span>{dateDisplay}</span>}
                            <Badge variant={isOutbound ? 'secondary' : 'outline'} className="text-[10px] px-1 py-0">
                              {messageType === 1 || messageType === 'TYPE_SMS' ? 'SMS' : 
                               messageType === 2 || messageType === 'TYPE_EMAIL' ? 'Email' : 
                               typeof messageType === 'string' ? messageType.replace('TYPE_', '') : 'Message'}
                            </Badge>
                            {isOutbound && msg.status && (
                              <span>
                                {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Footer */}
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
