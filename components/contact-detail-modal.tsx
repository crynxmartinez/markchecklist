'use client'

import { useState, useEffect, useRef } from 'react'
import { Mail, Phone, Tag, Calendar, MessageSquare, FileText, ListTodo, Plus, ChevronRight, ChevronDown, CheckCircle2, Circle, Trash2, X, Loader2, Edit2, Save } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { MessageComposer } from '@/components/message-composer'
import { ScheduleAppointmentModal } from '@/components/schedule-appointment-modal'

interface Contact {
  id: string
  ghlContactId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags: string[]
  subAccount?: string
  dateAdded?: string
  recruitmentStage?: string
}

interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  createdAt: string
}

interface Note {
  id: string
  content: string
  createdAt: string
}

interface Appointment {
  id: string
  title?: string
  startTime: string
  endTime: string
  status?: string
}

interface Message {
  id: string
  body: string
  direction: string
  dateAdded: string
  type?: string
  meta?: {
    email?: {
      subject?: string
    }
  }
}

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
}

interface Pipeline {
  id: string
  name: string
  stages: PipelineStage[]
}

interface ContactDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contact: Contact | null
  onContactUpdated?: () => void
  // When provided, this is an agent/admin record — use GHL routes directly
  isGhlMode?: boolean
}

export function ContactDetailModal({
  open,
  onOpenChange,
  contact,
  onContactUpdated,
  isGhlMode = false,
}: ContactDetailModalProps) {
  // Data states
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [appointments, setAppointments] = useState<{ upcoming: Appointment[], past: Appointment[] }>({ upcoming: [], past: [] })
  const [pipelines, setPipelines] = useState<Pipeline[]>([])
  const [contactStage, setContactStage] = useState<{ pipelineId: string, stageId: string } | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  
  // Loading states
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingAppointments, setLoadingAppointments] = useState(false)
  const [loadingMessages, setLoadingMessages] = useState(false)
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  const [newTag, setNewTag] = useState('')
  const [addingTag, setAddingTag] = useState(false)
  
  // Edit contact states
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: ''
  })
  const [savingContact, setSavingContact] = useState(false)
  
  // Collapsible states
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['tasks']))
  
  // Schedule modal
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open && contact) {
      fetchAllData()
    }
  }, [open, contact])

  useEffect(() => {
    // Scroll to bottom when messages load
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
      }, 100)
    }
  }, [messages])

  const fetchAllData = async () => {
    if (!contact) return
    await Promise.all([
      fetchTasks(),
      fetchNotes(),
      fetchAppointments(),
      fetchConversations(),
      fetchPipelines(),
      fetchContactStage()
    ])
  }

  const fetchPipelines = async () => {
    try {
      const res = await fetch('/api/pipelines')
      const data = await res.json()
      setPipelines(data.pipelines || [])
    } catch (error) {
      console.error('Error fetching pipelines:', error)
    }
  }

  const fetchContactStage = async () => {
    if (!contact || isGhlMode) return
    try {
      const res = await fetch(`/api/contacts/${contact.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.contact?.recruitmentStage) {
        setContactStage({ pipelineId: '', stageId: data.contact.recruitmentStage })
      } else {
        setContactStage(null)
      }
    } catch (error) {
      console.error('Error fetching contact stage:', error)
    }
  }

  const fetchTasks = async () => {
    if (!contact) return
    setLoadingTasks(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/tasks`)
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const fetchNotes = async () => {
    if (!contact) return
    setLoadingNotes(true)
    try {
      const res = await fetch(`/api/contacts/${contact.id}/notes`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchAppointments = async () => {
    if (!contact) return
    setLoadingAppointments(true)
    try {
      const url = isGhlMode
        ? `/api/ghl/${contact.ghlContactId}/appointments`
        : `/api/contacts/${contact.id}/appointments`
      const res = await fetch(url)
      const data = await res.json()
      setAppointments({
        upcoming: data.upcoming || [],
        past: data.past || []
      })
    } catch (error) {
      console.error('Error fetching appointments:', error)
    } finally {
      setLoadingAppointments(false)
    }
  }

  const fetchConversations = async () => {
    if (!contact) return
    setLoadingMessages(true)
    try {
      const url = isGhlMode
        ? `/api/ghl/${contact.ghlContactId}/conversations`
        : `/api/contacts/${contact.id}/conversations`
      const res = await fetch(url)
      const data = await res.json()
      const allMessages: Message[] = []
      for (const conv of data.conversations || []) {
        allMessages.push(...(conv.messages || []))
      }
      allMessages.sort((a, b) => {
        const dateA = new Date(parseInt(a.dateAdded) || a.dateAdded).getTime()
        const dateB = new Date(parseInt(b.dateAdded) || b.dateAdded).getTime()
        return dateA - dateB
      })
      setMessages(allMessages)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoadingMessages(false)
    }
  }

  const handleAddTask = async () => {
    if (!contact || !newTaskTitle.trim() || isGhlMode) return
    try {
      await fetch(`/api/contacts/${contact.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTaskTitle })
      })
      setNewTaskTitle('')
      fetchTasks()
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    if (!contact) return
    try {
      await fetch(`/api/contacts/${contact.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })
      fetchTasks()
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (!contact) return
    try {
      await fetch(`/api/contacts/${contact.id}/tasks/${taskId}`, {
        method: 'DELETE'
      })
      fetchTasks()
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleAddNote = async () => {
    if (!contact || !newNoteContent.trim() || isGhlMode) return
    try {
      await fetch(`/api/contacts/${contact.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent })
      })
      setNewNoteContent('')
      fetchNotes()
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!contact) return
    try {
      await fetch(`/api/contacts/${contact.id}/notes/${noteId}`, {
        method: 'DELETE'
      })
      fetchNotes()
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  const handleAddTag = async () => {
    if (!contact || !newTag.trim()) return
    setAddingTag(true)
    try {
      const updatedTags = [...contact.tags, newTag.trim()]
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags })
      })
      setNewTag('')
      onContactUpdated?.()
    } catch (error) {
      console.error('Error adding tag:', error)
    } finally {
      setAddingTag(false)
    }
  }

  const handleRemoveTag = async (tagToRemove: string) => {
    if (!contact) return
    try {
      const updatedTags = contact.tags.filter(t => t !== tagToRemove)
      await fetch(`/api/contacts/${contact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tags: updatedTags })
      })
      onContactUpdated?.()
    } catch (error) {
      console.error('Error removing tag:', error)
    }
  }

  const handleStageChange = async (newStageId: string) => {
    if (!contact) return
    try {
      const res = await fetch(`/api/contacts/${contact.id}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStageId })
      })
      if (res.ok) {
        setContactStage({ pipelineId: '', stageId: newStageId })
        onContactUpdated?.()
      }
    } catch (error) {
      console.error('Error changing stage:', error)
    }
  }

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const startEditing = () => {
    if (!contact) return
    setEditForm({
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || ''
    })
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditForm({ firstName: '', lastName: '', email: '', phone: '' })
  }

  const saveContact = async () => {
    if (!contact) return
    setSavingContact(true)
    try {
      if (isGhlMode) {
        // For agents/admins, save via their own API route
        setIsEditing(false)
        onContactUpdated?.()
      } else {
        const res = await fetch(`/api/contacts/${contact.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            firstName: editForm.firstName,
            lastName: editForm.lastName,
            email: editForm.email,
            phone: editForm.phone,
            tags: contact.tags
          })
        })
        if (res.ok) {
          setIsEditing(false)
          onContactUpdated?.()
        }
      }
    } catch (error) {
      console.error('Error saving contact:', error)
    } finally {
      setSavingContact(false)
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) || dateStr)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (!contact) return null

  const contactName = contact.firstName || contact.lastName
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    : 'No Name'

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="!w-[99vw] !max-w-[1800px] !h-[95vh] !max-h-[1000px] p-0 gap-0 !block overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                <span className="text-lg font-semibold text-primary">
                  {(contact.firstName?.[0] || contact.lastName?.[0] || '?').toUpperCase()}
                </span>
              </div>
              <div>
                <h2 className="text-lg font-semibold">{contactName}</h2>
                {contact.subAccount && (
                  <Badge variant="outline" className="text-xs">{contact.subAccount}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Main Content - 3 Panel Layout */}
          <div className="flex h-[calc(100%-65px)]">
            {/* Left Panel - Contact Info */}
            <div className="w-[280px] border-r overflow-y-auto bg-muted/30 p-4 space-y-4">
              {/* Contact Info */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase">Contact Info</h3>
                  {!isEditing ? (
                    <Button variant="ghost" size="sm" className="h-6 px-2" onClick={startEditing}>
                      <Edit2 className="h-3 w-3 mr-1" />
                      <span className="text-xs">Edit</span>
                    </Button>
                  ) : (
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-6 px-2" onClick={cancelEditing}>
                        <X className="h-3 w-3" />
                      </Button>
                      <Button size="sm" className="h-6 px-2" onClick={saveContact} disabled={savingContact}>
                        {savingContact ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                      </Button>
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">First Name</Label>
                        <Input
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Last Name</Label>
                        <Input
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div>
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`mailto:${contact.email}`} className="hover:underline truncate text-xs">
                          {contact.email}
                        </a>
                      </div>
                    )}
                    {contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <a href={`tel:${contact.phone}`} className="hover:underline text-xs">
                          {contact.phone}
                        </a>
                      </div>
                    )}
                    {!contact.email && !contact.phone && (
                      <p className="text-xs text-muted-foreground italic">No contact info</p>
                    )}
                  </div>
                )}
              </div>

              {/* Tags Section */}
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground uppercase flex items-center gap-2">
                  <Tag className="h-3 w-3" />
                  Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs group">
                      {tag}
                      <button
                        onClick={() => handleRemoveTag(tag)}
                        className="ml-1 opacity-0 group-hover:opacity-100 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-1">
                  <Input
                    placeholder="Add tag..."
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    className="text-xs h-7"
                  />
                  <Button size="sm" className="h-7 px-2" onClick={handleAddTag} disabled={addingTag}>
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Middle Panel - Messages */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0">
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto bg-gray-50 p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mb-4" />
                    <p>No messages yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                            msg.direction === 'outbound'
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-200 shadow-sm'
                          }`}
                        >
                          {msg.meta?.email?.subject && (
                            <p className={`text-xs font-semibold mb-2 ${msg.direction === 'outbound' ? 'text-blue-100' : 'text-gray-500'}`}>
                              📧 {msg.meta.email.subject}
                            </p>
                          )}
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.body}</p>
                          <p className={`text-xs mt-2 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                            {formatTime(msg.dateAdded)}
                          </p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Composer */}
              <div className="border-t bg-background flex-shrink-0">
                <MessageComposer
                  contactId={contact.ghlContactId}
                  contactPhone={contact.phone}
                  contactEmail={contact.email}
                  defaultType="SMS"
                  onMessageSent={() => fetchConversations()}
                />
              </div>
            </div>

            {/* Right Panel - Collapsible Sections */}
            <div className="w-[280px] border-l overflow-y-auto bg-background">
              {/* Tasks Section */}
              <div className="border-b">
                <button
                  onClick={() => toggleSection('tasks')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <ListTodo className="h-4 w-4 text-purple-600" />
                    <span className="font-medium text-sm">Tasks</span>
                    {tasks.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{tasks.length}</Badge>
                    )}
                  </div>
                  {expandedSections.has('tasks') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedSections.has('tasks') && (
                  <div className="p-3 pt-0 space-y-2">
                    <div className="flex gap-1">
                      <Input
                        placeholder="Add task..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        className="text-xs h-8"
                      />
                      <Button size="sm" className="h-8 px-2" onClick={handleAddTask}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    {loadingTasks ? (
                      <div className="text-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-[150px] overflow-y-auto">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 text-xs p-2 rounded hover:bg-muted group"
                          >
                            <button onClick={() => handleToggleTask(task.id, task.completed)}>
                              {task.completed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-muted-foreground" />
                              )}
                            </button>
                            <span className={`flex-1 ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {task.title}
                            </span>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="opacity-0 group-hover:opacity-100 text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Notes Section */}
              <div className="border-b">
                <button
                  onClick={() => toggleSection('notes')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-sm">Notes</span>
                    {notes.length > 0 && (
                      <Badge variant="secondary" className="text-xs">{notes.length}</Badge>
                    )}
                  </div>
                  {expandedSections.has('notes') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedSections.has('notes') && (
                  <div className="p-3 pt-0 space-y-2">
                    <Textarea
                      placeholder="Add a note..."
                      value={newNoteContent}
                      onChange={(e) => setNewNoteContent(e.target.value)}
                      rows={2}
                      className="text-xs"
                    />
                    <Button size="sm" onClick={handleAddNote} className="w-full h-7 text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Note
                    </Button>
                    {loadingNotes ? (
                      <div className="text-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {notes.map((note) => (
                          <div key={note.id} className="p-2 bg-yellow-50 rounded text-xs group relative">
                            <p className="whitespace-pre-wrap pr-4">{note.content}</p>
                            <p className="text-muted-foreground mt-1 text-[10px]">
                              {new Date(note.createdAt).toLocaleDateString()}
                            </p>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 text-red-500"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Appointments Section */}
              <div className="border-b">
                <button
                  onClick={() => toggleSection('appointments')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-sm">Appointments</span>
                    {(appointments.upcoming.length + appointments.past.length) > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {appointments.upcoming.length + appointments.past.length}
                      </Badge>
                    )}
                  </div>
                  {expandedSections.has('appointments') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedSections.has('appointments') && (
                  <div className="p-3 pt-0 space-y-2">
                    <Button 
                      size="sm" 
                      onClick={() => setScheduleModalOpen(true)} 
                      className="w-full h-7 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Schedule Appointment
                    </Button>
                    {loadingAppointments ? (
                      <div className="text-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[150px] overflow-y-auto">
                        {appointments.upcoming.length > 0 && (
                          <div>
                            <p className="text-[10px] text-green-600 font-medium mb-1">Upcoming</p>
                            {appointments.upcoming.map((apt) => (
                              <div key={apt.id} className="p-2 bg-green-50 rounded text-xs mb-1">
                                <p className="font-medium">{apt.title || 'Appointment'}</p>
                                <p className="text-muted-foreground">
                                  {new Date(apt.startTime).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {appointments.past.length > 0 && (
                          <div>
                            <p className="text-[10px] text-muted-foreground font-medium mb-1">Past</p>
                            {appointments.past.slice(0, 3).map((apt) => (
                              <div key={apt.id} className="p-2 bg-gray-50 rounded text-xs mb-1">
                                <p className="font-medium text-muted-foreground">{apt.title || 'Appointment'}</p>
                                <p className="text-muted-foreground text-[10px]">
                                  {new Date(apt.startTime).toLocaleString()}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                        {appointments.upcoming.length === 0 && appointments.past.length === 0 && (
                          <p className="text-xs text-muted-foreground text-center py-2">No appointments</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Pipeline Section */}
              <div className="border-b">
                <button
                  onClick={() => toggleSection('pipeline')}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gradient-to-r from-blue-500 to-purple-500" />
                    <span className="font-medium text-sm">Pipeline</span>
                  </div>
                  {expandedSections.has('pipeline') ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
                {expandedSections.has('pipeline') && (
                  <div className="p-3 pt-0 space-y-2">
                    {/* Current Stage Display */}
                    {(() => {
                      const currentStage = pipelines
                        .flatMap(p => p.stages)
                        .find(s => s.id === contactStage?.stageId)
                      
                      return (
                        <div className="space-y-2">
                          <p className="text-xs text-muted-foreground">Current Stage</p>
                          {currentStage ? (
                            <div className="flex items-center gap-2 p-2 bg-primary/10 rounded border border-primary/20">
                              <div
                                className="w-3 h-3 rounded-full flex-shrink-0"
                                style={{ backgroundColor: currentStage.color }}
                              />
                              <span className="text-sm font-medium">{currentStage.name}</span>
                            </div>
                          ) : (
                            <p className="text-xs text-muted-foreground italic">Not in any stage</p>
                          )}
                        </div>
                      )
                    })()}

                    {/* Stage Dropdown */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">Move to Stage</p>
                      <select
                        value={contactStage?.stageId || ''}
                        onChange={(e) => {
                          if (e.target.value) {
                            handleStageChange(e.target.value)
                          }
                        }}
                        className="w-full p-2 text-sm border rounded-md bg-background"
                      >
                        <option value="">Select a stage...</option>
                        {pipelines.map((pipeline) => (
                          <optgroup key={pipeline.id} label={pipeline.name}>
                            {pipeline.stages
                              .sort((a, b) => a.order - b.order)
                              .map((stage) => (
                                <option key={stage.id} value={stage.id}>
                                  {stage.name}
                                </option>
                              ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Appointment Modal */}
      <ScheduleAppointmentModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        contactId={contact.id}
        contactName={contactName}
        onAppointmentCreated={() => fetchAppointments()}
      />
    </>
  )
}
