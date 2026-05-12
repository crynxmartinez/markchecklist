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
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchConversationsList()
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

  const fetchMessages = async (conversationId: string) => {
    setLoadingMessages(true)
    console.log('Fetching messages for:', conversationId)
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`)
      const data = await res.json()
      console.log('Messages response:', data)
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
  }

  const filteredConversations = conversationsList.filter(conv => {
    const name = (conv.contactName || '').toLowerCase()
    const email = (conv.email || '').toLowerCase()
    const phone = (conv.phone || '').toLowerCase()
    const query = searchQuery.toLowerCase()
    return name.includes(query) || email.includes(query) || phone.includes(query)
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
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Loading conversations from GHL...</p>
          ) : filteredConversations.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No conversations found</p>
          ) : (
            <div className="divide-y">
              {filteredConversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className={`w-full p-3 text-left hover:bg-muted transition-colors ${
                    selectedConversation?.id === conv.id ? 'bg-muted' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-medium text-primary">
                        {getInitials(conv.contactName || 'Unknown')}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm truncate">{conv.contactName || 'Unknown'}</p>
                        {conv.lastMessageDate && (
                          <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDate(conv.lastMessageDate)}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {conv.lastMessageBody || 'No messages'}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {conv.type === 'TYPE_PHONE' ? 'SMS' : conv.type === 'TYPE_EMAIL' ? 'Email' : conv.type}
                        </Badge>
                        {conv.unreadCount && conv.unreadCount > 0 && (
                          <Badge className="text-[10px] px-1.5 py-0">{conv.unreadCount}</Badge>
                        )}
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
                  {messages.map((msg) => (
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
                          <span>{new Date(parseInt(msg.dateAdded) || msg.dateAdded).toLocaleString()}</span>
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
