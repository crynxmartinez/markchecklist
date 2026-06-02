'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Mail, Phone, Tag, Calendar, MessageSquare, FileText, ListTodo, Send, Plus, Trash2, CheckCircle2, Circle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { MessageComposer } from '@/components/message-composer'

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
  lastUpdated?: string
  createdAt: string
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
}

interface ActivityItem {
  id: string
  type: 'appointment' | 'message' | 'note' | 'task'
  date: string
  data: any
}

export default function ContactDetailPage() {
  const params = useParams()
  const router = useRouter()
  const contactId = params.id as string

  const [contact, setContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState<ActivityItem[]>([])
  
  // Data states
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [messages, setMessages] = useState<Message[]>([])
  
  // Form states
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (contactId) {
      fetchContact()
      fetchAllData()
    }
  }, [contactId])

  useEffect(() => {
    // Combine all data into activity timeline
    const allActivities: ActivityItem[] = [
      ...appointments.map(apt => ({
        id: `apt-${apt.id}`,
        type: 'appointment' as const,
        date: apt.startTime,
        data: apt
      })),
      ...messages.map(msg => ({
        id: `msg-${msg.id}`,
        type: 'message' as const,
        date: msg.dateAdded,
        data: msg
      })),
      ...notes.map(note => ({
        id: `note-${note.id}`,
        type: 'note' as const,
        date: note.createdAt,
        data: note
      })),
      ...tasks.map(task => ({
        id: `task-${task.id}`,
        type: 'task' as const,
        date: task.createdAt,
        data: task
      }))
    ]

    // Sort by date descending (newest first)
    allActivities.sort((a, b) => {
      const dateA = new Date(parseInt(a.date) || a.date).getTime()
      const dateB = new Date(parseInt(b.date) || b.date).getTime()
      return dateB - dateA
    })

    setActivities(allActivities)
  }, [appointments, messages, notes, tasks])

  const fetchContact = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}`)
      const data = await res.json()
      setContact(data.contact)
    } catch (error) {
      console.error('Error fetching contact:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAllData = async () => {
    await Promise.all([
      fetchTasks(),
      fetchNotes(),
      fetchAppointments(),
      fetchConversations()
    ])
  }

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/tasks`)
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    }
  }

  const fetchNotes = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    }
  }

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/appointments`)
      const data = await res.json()
      setAppointments([...(data.upcoming || []), ...(data.past || [])])
    } catch (error) {
      console.error('Error fetching appointments:', error)
    }
  }

  const fetchConversations = async () => {
    try {
      const res = await fetch(`/api/contacts/${contactId}/conversations`)
      const data = await res.json()
      // Flatten all messages from conversations
      const allMessages: Message[] = []
      for (const conv of data.conversations || []) {
        allMessages.push(...(conv.messages || []))
      }
      setMessages(allMessages)
    } catch (error) {
      console.error('Error fetching conversations:', error)
    }
  }

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return
    try {
      await fetch(`/api/contacts/${contactId}/tasks`, {
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
    try {
      await fetch(`/api/contacts/${contactId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed })
      })
      fetchTasks()
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleAddNote = async () => {
    if (!newNoteContent.trim()) return
    try {
      await fetch(`/api/contacts/${contactId}/notes`, {
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

  const formatDate = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) || dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Today'
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(parseInt(dateStr) || dateStr)
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  }

  // Group activities by date
  const groupedActivities = activities.reduce((groups, activity) => {
    const dateKey = formatDate(activity.date)
    if (!groups[dateKey]) {
      groups[dateKey] = []
    }
    groups[dateKey].push(activity)
    return groups
  }, {} as Record<string, ActivityItem[]>)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading contact...</p>
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted-foreground">Contact not found</p>
        <Button variant="outline" onClick={() => router.push('/dashboard/contacts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Contacts
        </Button>
      </div>
    )
  }

  const contactName = contact.firstName || contact.lastName
    ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    : 'No Name'

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b bg-background">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard/contacts')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">
              {(contact.firstName?.[0] || contact.lastName?.[0] || '?').toUpperCase()}
            </span>
          </div>
          <h1 className="text-xl font-semibold">{contactName}</h1>
        </div>
      </div>

      {/* Main Content - 3 Panel Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Contact Info */}
        <div className="w-[300px] border-r overflow-y-auto bg-muted/30">
          <div className="p-4 space-y-4">
            {/* Contact Section */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">Contact</h3>
              
              {contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${contact.email}`} className="hover:underline truncate">
                    {contact.email}
                  </a>
                </div>
              )}
              
              {contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${contact.phone}`} className="hover:underline">
                    {contact.phone}
                  </a>
                </div>
              )}

              {contact.subAccount && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Sub Account: </span>
                  <Badge variant="outline" className="text-xs">{contact.subAccount}</Badge>
                </div>
              )}

              {contact.dateAdded && (
                <div className="text-sm text-muted-foreground">
                  Added: {new Date(contact.dateAdded).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Tags Section */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Tag className="h-4 w-4" />
                Tags
              </h3>
              {contact.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {contact.tags.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No tags</p>
              )}
            </div>

            {/* Quick Add Task */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <ListTodo className="h-4 w-4" />
                Quick Add Task
              </h3>
              <div className="flex gap-2">
                <Input
                  placeholder="New task..."
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                  className="text-sm"
                />
                <Button size="sm" onClick={handleAddTask}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {/* Task List */}
              <div className="space-y-1 max-h-[200px] overflow-y-auto">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2 text-sm p-2 rounded hover:bg-muted cursor-pointer"
                    onClick={() => handleToggleTask(task.id, task.completed)}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className={task.completed ? 'line-through text-muted-foreground' : ''}>
                      {task.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Add Note */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Quick Add Note
              </h3>
              <Textarea
                placeholder="Add a note..."
                value={newNoteContent}
                onChange={(e) => setNewNoteContent(e.target.value)}
                rows={2}
                className="text-sm"
              />
              <Button size="sm" onClick={handleAddNote} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
          </div>
        </div>

        {/* Middle Panel - Activity Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Timeline */}
          <div className="flex-1 overflow-y-auto p-4">
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageSquare className="h-12 w-12 mb-4" />
                <p>No activity yet</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedActivities).map(([date, items]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-px flex-1 bg-border" />
                      <span className="text-xs text-muted-foreground font-medium px-2">{date}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <div className="space-y-3">
                      {items.map((activity) => (
                        <div key={activity.id} className="flex gap-3">
                          <div className="flex-shrink-0 mt-1">
                            {activity.type === 'appointment' && (
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-blue-600" />
                              </div>
                            )}
                            {activity.type === 'message' && (
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                activity.data.direction === 'outbound' ? 'bg-green-100' : 'bg-gray-100'
                              }`}>
                                <MessageSquare className={`h-4 w-4 ${
                                  activity.data.direction === 'outbound' ? 'text-green-600' : 'text-gray-600'
                                }`} />
                              </div>
                            )}
                            {activity.type === 'note' && (
                              <div className="w-8 h-8 rounded-full bg-yellow-100 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-yellow-600" />
                              </div>
                            )}
                            {activity.type === 'task' && (
                              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                                <ListTodo className="h-4 w-4 text-purple-600" />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            {activity.type === 'appointment' && (
                              <Card className="p-3">
                                <p className="text-sm font-medium">
                                  📅 Appointment: {activity.data.title || 'Scheduled'}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {new Date(activity.data.startTime).toLocaleString()}
                                </p>
                                {activity.data.status && (
                                  <Badge variant="outline" className="text-xs mt-2">
                                    {activity.data.status}
                                  </Badge>
                                )}
                              </Card>
                            )}
                            {activity.type === 'message' && (
                              <Card className={`p-3 ${
                                activity.data.direction === 'outbound' 
                                  ? 'bg-green-50 border-green-200' 
                                  : 'bg-white'
                              }`}>
                                <p className="text-xs text-muted-foreground mb-1">
                                  {activity.data.direction === 'outbound' ? '↑ Sent' : '↓ Received'} • {formatTime(activity.date)}
                                </p>
                                <p className="text-sm whitespace-pre-wrap">{activity.data.body}</p>
                              </Card>
                            )}
                            {activity.type === 'note' && (
                              <Card className="p-3 bg-yellow-50 border-yellow-200">
                                <p className="text-xs text-muted-foreground mb-1">📝 Note</p>
                                <p className="text-sm whitespace-pre-wrap">{activity.data.content}</p>
                              </Card>
                            )}
                            {activity.type === 'task' && (
                              <Card className="p-3">
                                <p className="text-sm">
                                  {activity.data.completed ? '✅' : '⬜'} Task: {activity.data.title}
                                </p>
                                {activity.data.dueDate && (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Due: {new Date(activity.data.dueDate).toLocaleDateString()}
                                  </p>
                                )}
                              </Card>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Message Composer */}
          <div className="border-t bg-background">
            <MessageComposer
              contactId={contact.ghlContactId}
              contactPhone={contact.phone}
              contactEmail={contact.email}
              defaultType="SMS"
              onMessageSent={() => fetchConversations()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
