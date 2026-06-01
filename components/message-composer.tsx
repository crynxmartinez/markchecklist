'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Send, MessageSquare, Mail, Loader2 } from 'lucide-react'

interface MessageComposerProps {
  contactId: string
  defaultType?: 'SMS' | 'Email'
  onMessageSent?: () => void
}

export function MessageComposer({ contactId, defaultType = 'SMS', onMessageSent }: MessageComposerProps) {
  const [type, setType] = useState<'SMS' | 'Email'>(defaultType)
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!message.trim()) return
    if (type === 'Email' && !subject.trim()) {
      setError('Subject is required for emails')
      return
    }

    setSending(true)
    setError(null)

    try {
      const response = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          type,
          message: message.trim(),
          subject: type === 'Email' ? subject.trim() : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Clear form on success
      setMessage('')
      setSubject('')
      
      // Callback to refresh messages
      if (onMessageSent) {
        onMessageSent()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && type === 'SMS') {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t bg-muted/30 p-3 space-y-3">
      {/* Type Toggle */}
      <div className="flex gap-1">
        <Button
          type="button"
          size="sm"
          variant={type === 'SMS' ? 'default' : 'outline'}
          onClick={() => setType('SMS')}
          className="flex-1"
        >
          <MessageSquare className="h-4 w-4 mr-1" />
          SMS
        </Button>
        <Button
          type="button"
          size="sm"
          variant={type === 'Email' ? 'default' : 'outline'}
          onClick={() => setType('Email')}
          className="flex-1"
        >
          <Mail className="h-4 w-4 mr-1" />
          Email
        </Button>
      </div>

      {/* Subject (Email only) */}
      {type === 'Email' && (
        <Input
          placeholder="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          disabled={sending}
        />
      )}

      {/* Message Input */}
      <div className="flex gap-2">
        <Textarea
          placeholder={type === 'SMS' ? 'Type your message...' : 'Type your email...'}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={sending}
          className="min-h-[60px] max-h-[120px] resize-none"
          rows={2}
        />
        <Button
          onClick={handleSend}
          disabled={sending || !message.trim() || (type === 'Email' && !subject.trim())}
          size="icon"
          className="h-auto aspect-square"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  )
}
