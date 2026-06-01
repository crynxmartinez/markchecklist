'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Send, MessageSquare, Mail, Loader2, ChevronDown, Bold, Italic, Underline, Link, List, ListOrdered } from 'lucide-react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import UnderlineExtension from '@tiptap/extension-underline'

interface MessageComposerProps {
  contactId: string
  contactPhone?: string
  contactEmail?: string
  defaultType?: 'SMS' | 'Email'
  onMessageSent?: () => void
}

interface PhoneNumber {
  id: string
  phoneNumber: string
  name?: string
}

interface EmailAddress {
  id: string
  email: string
  name?: string
}

export function MessageComposer({ 
  contactId, 
  contactPhone,
  contactEmail,
  defaultType = 'SMS', 
  onMessageSent 
}: MessageComposerProps) {
  const [type, setType] = useState<'SMS' | 'Email'>(defaultType)
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // From options
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([])
  const [emailAddresses, setEmailAddresses] = useState<EmailAddress[]>([])
  const [selectedPhone, setSelectedPhone] = useState<string>('')
  const [selectedEmail, setSelectedEmail] = useState<string>('')
  const [showPhoneDropdown, setShowPhoneDropdown] = useState(false)
  const [showEmailDropdown, setShowEmailDropdown] = useState(false)

  // Rich text editor for email
  const editor = useEditor({
    extensions: [
      StarterKit,
      UnderlineExtension,
      LinkExtension.configure({
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: 'Compose your email...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[100px] px-3 py-2',
      },
    },
  })

  // Fetch phone numbers and email addresses
  useEffect(() => {
    const fetchFromOptions = async () => {
      try {
        const [phoneRes, emailRes] = await Promise.all([
          fetch('/api/ghl/phone-numbers'),
          fetch('/api/ghl/email-addresses')
        ])
        
        const phoneData = await phoneRes.json()
        const emailData = await emailRes.json()
        
        if (phoneData.phoneNumbers?.length > 0) {
          setPhoneNumbers(phoneData.phoneNumbers)
          setSelectedPhone(phoneData.phoneNumbers[0].phoneNumber)
        }
        
        if (emailData.emailAddresses?.length > 0) {
          setEmailAddresses(emailData.emailAddresses)
          setSelectedEmail(emailData.emailAddresses[0].email)
        }
      } catch (err) {
        console.error('Failed to fetch from options:', err)
      }
    }
    
    fetchFromOptions()
  }, [])

  const handleSend = async () => {
    const messageContent = type === 'Email' ? editor?.getHTML() || '' : message
    
    if (!messageContent.trim() || (type === 'Email' && messageContent === '<p></p>')) {
      setError('Please enter a message')
      return
    }
    if (type === 'Email' && !subject.trim()) {
      setError('Subject is required for emails')
      return
    }

    setSending(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/conversations/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId,
          type,
          message: messageContent,
          subject: type === 'Email' ? subject.trim() : undefined,
          fromNumber: type === 'SMS' ? selectedPhone : undefined,
          fromEmail: type === 'Email' ? selectedEmail : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send message')
      }

      // Clear form on success
      setMessage('')
      setSubject('')
      editor?.commands.clearContent()
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
      
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

  const addLink = () => {
    const url = window.prompt('Enter URL:')
    if (url && editor) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="border rounded-lg bg-white shadow-sm overflow-hidden">
      {/* Type Toggle - Modern Tab Style */}
      <div className="flex border-b">
        <button
          type="button"
          onClick={() => setType('SMS')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
            type === 'SMS' 
              ? 'bg-white text-primary border-b-2 border-primary' 
              : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          SMS
        </button>
        <button
          type="button"
          onClick={() => setType('Email')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 text-sm font-medium transition-all ${
            type === 'Email' 
              ? 'bg-white text-primary border-b-2 border-primary' 
              : 'bg-gray-50 text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <Mail className="h-4 w-4" />
          Email
        </button>
      </div>

      {/* From / To Row */}
      <div className="flex items-center border-b text-sm">
        {/* From */}
        <div className="flex items-center gap-2 px-4 py-2 border-r min-w-[200px]">
          <span className="text-gray-400 font-medium">From:</span>
          {type === 'SMS' ? (
            <div className="relative">
              <button
                onClick={() => setShowPhoneDropdown(!showPhoneDropdown)}
                className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
              >
                {selectedPhone || 'Select number'}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showPhoneDropdown && phoneNumbers.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[180px]">
                  {phoneNumbers.map((phone) => (
                    <button
                      key={phone.id}
                      onClick={() => {
                        setSelectedPhone(phone.phoneNumber)
                        setShowPhoneDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {phone.phoneNumber}
                      {phone.name && <span className="text-gray-400 ml-2">({phone.name})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowEmailDropdown(!showEmailDropdown)}
                className="flex items-center gap-1 text-primary hover:text-primary/80 font-medium"
              >
                {selectedEmail || 'Select email'}
                <ChevronDown className="h-3 w-3" />
              </button>
              {showEmailDropdown && emailAddresses.length > 0 && (
                <div className="absolute top-full left-0 mt-1 bg-white border rounded-md shadow-lg z-10 min-w-[220px]">
                  {emailAddresses.map((email) => (
                    <button
                      key={email.id}
                      onClick={() => {
                        setSelectedEmail(email.email)
                        setShowEmailDropdown(false)
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 text-sm"
                    >
                      {email.email}
                      {email.name && <span className="text-gray-400 ml-2">({email.name})</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* To */}
        <div className="flex items-center gap-2 px-4 py-2 flex-1">
          <span className="text-gray-400 font-medium">To:</span>
          <span className="text-gray-700 font-medium">
            {type === 'SMS' ? (contactPhone || 'No phone') : (contactEmail || 'No email')}
          </span>
        </div>
      </div>

      {/* Subject (Email only) */}
      {type === 'Email' && (
        <div className="border-b">
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={sending}
            className="border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 px-4"
          />
        </div>
      )}

      {/* Message Input */}
      {type === 'SMS' ? (
        <div className="p-4">
          <textarea
            placeholder="Type your message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            className="w-full min-h-[80px] resize-none border-0 focus:outline-none focus:ring-0 text-sm placeholder:text-gray-400"
            rows={3}
          />
        </div>
      ) : (
        <>
          {/* Rich Text Toolbar */}
          <div className="flex items-center gap-1 px-3 py-2 border-b bg-gray-50">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
              title="Bold"
            >
              <Bold className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
              title="Italic"
            >
              <Italic className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('underline') ? 'bg-gray-200' : ''}`}
              title="Underline"
            >
              <Underline className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={addLink}
              className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('link') ? 'bg-gray-200' : ''}`}
              title="Add Link"
            >
              <Link className="h-4 w-4" />
            </button>
            <div className="w-px h-5 bg-gray-300 mx-1" />
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
              title="Bullet List"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-1.5 rounded hover:bg-gray-200 ${editor?.isActive('orderedList') ? 'bg-gray-200' : ''}`}
              title="Numbered List"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
          </div>
          
          {/* Editor */}
          <div className="min-h-[120px]">
            <EditorContent editor={editor} />
          </div>
        </>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
        <div className="flex items-center gap-2">
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
          {success && (
            <p className="text-xs text-green-600 font-medium">Message sent!</p>
          )}
        </div>
        
        <Button
          onClick={handleSend}
          disabled={sending || (type === 'SMS' && !message.trim()) || (type === 'Email' && !subject.trim())}
          className="gap-2"
        >
          {sending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Send {type}
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
