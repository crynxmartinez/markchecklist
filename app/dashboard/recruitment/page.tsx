'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, Phone, GripVertical, Plus, Trash2, Edit, MoreVertical, Download, CheckCircle2, Circle, Calendar, FileText, ListTodo, User, MessageSquare, Send, Settings } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface Contact {
  id: string
  ghlContactId: string
  firstName?: string
  lastName?: string
  email?: string
  phone?: string
  tags: string[]
  source?: string
  recruitmentStage?: string
  subAccount?: string
  dateAdded?: string
}

interface Task {
  id: string
  title: string
  description?: string
  dueDate?: string
  completed: boolean
  createdAt: string
}

interface Note {
  id: string
  content: string
  createdAt: string
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
  type: string
  lastMessageBody?: string
  lastMessageDate?: string
  messages: Message[]
}

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
  contactCount?: number
}

interface KanbanColumn {
  id: string
  title: string
  color: string
  contacts: Contact[]
}

function ContactCard({ contact, onClick }: { contact: Contact; onClick?: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: contact.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const truncateTag = (tag: string, maxLength: number = 20) => {
    return tag.length > maxLength ? tag.substring(0, maxLength) + '...' : tag
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border p-3 mb-2 hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1 flex-shrink-0">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={onClick}
        >
          <h4 className="font-medium text-sm truncate">
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              : 'No Name'}
          </h4>
          {contact.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Phone className="h-3 w-3 flex-shrink-0" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap overflow-hidden max-h-12">
              {contact.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs truncate max-w-[120px]" title={tag}>
                  {truncateTag(tag)}
                </Badge>
              ))}
              {contact.tags.length > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{contact.tags.length - 2}
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function DroppableColumn({ column, onEdit, onDelete, onContactClick }: { 
  column: KanbanColumn
  onEdit: (id: string, name: string, color: string) => void
  onDelete: (id: string) => void
  onContactClick: (contact: Contact) => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex-shrink-0 w-[300px] h-full">
      <Card className={`h-full flex flex-col ${isOver ? 'ring-2 ring-primary' : ''}`}>
        <CardHeader className="pb-3 flex-shrink-0">
          <CardTitle className="text-base flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-3 h-3 rounded-full" 
                style={{ backgroundColor: column.color }}
              />
              <span>{column.title}</span>
            </div>
            <div className="flex items-center gap-1">
              <Badge variant="secondary">{column.contacts.length}</Badge>
              <DropdownMenu>
                <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md hover:bg-accent">
                  <MoreVertical className="h-4 w-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit(column.id, column.title, column.color)}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Stage
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => onDelete(column.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Stage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent 
          ref={setNodeRef}
          className="flex-1 overflow-y-auto"
        >
          <SortableContext items={column.contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {column.contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} onClick={() => onContactClick(contact)} />
            ))}
            {column.contacts.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed rounded-lg">
                Drop contacts here
              </div>
            )}
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  )
}

interface SortableStageItemProps {
  stage: PipelineStage
  isEditing: boolean
  editName: string
  editColor: string
  colors: string[]
  saving: boolean
  onEditNameChange: (name: string) => void
  onEditColorChange: (color: string) => void
  onStartEdit: () => void
  onSaveEdit: () => void
  onCancelEdit: () => void
  onDelete: () => void
}

function SortableStageItem({
  stage,
  isEditing,
  editName,
  editColor,
  colors,
  saving,
  onEditNameChange,
  onEditColorChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (isEditing) {
    return (
      <div className="p-3 border rounded-lg space-y-3 bg-muted/50">
        <Input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          placeholder="Stage name"
          autoFocus
        />
        <div className="flex gap-2 flex-wrap">
          {colors.map((color) => (
            <button
              key={color}
              type="button"
              className={`w-6 h-6 rounded-full border-2 transition-all ${
                editColor === color ? 'border-black scale-110' : 'border-transparent'
              }`}
              style={{ backgroundColor: color }}
              onClick={() => onEditColorChange(color)}
            />
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onSaveEdit} disabled={saving || !editName.trim()}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
          <Button size="sm" variant="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 border rounded-lg bg-white hover:bg-muted/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      <div
        className="w-4 h-4 rounded-full flex-shrink-0"
        style={{ backgroundColor: stage.color }}
      />
      <div className="flex-1 min-w-0">
        <span className="font-medium">{stage.name}</span>
      </div>
      <Badge variant="secondary" className="flex-shrink-0">
        {stage.contactCount || 0}
      </Badge>
      <div className="flex gap-1 flex-shrink-0">
        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={onStartEdit}>
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" className="h-8 w-8 text-red-600 hover:text-red-700" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

export default function RecruitmentPage() {
  const [stages, setStages] = useState<PipelineStage[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [columns, setColumns] = useState<KanbanColumn[]>([])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [stageDialogOpen, setStageDialogOpen] = useState(false)
  const [editingStage, setEditingStage] = useState<PipelineStage | null>(null)
  const [stageName, setStageName] = useState('')
  const [stageColor, setStageColor] = useState('#6366f1')
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importResult, setImportResult] = useState<{
    success: boolean
    pipeline?: string
    totalOpportunities?: number
    contactsUpdated?: number
    contactsAdded?: number
    contactsRemoved?: number
    notesSynced?: number
    stagesCreated?: number
    stagesMapped?: number
    error?: string
    availablePipelines?: string[]
  } | null>(null)
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null)
  const [contactDialogOpen, setContactDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'tasks' | 'notes' | 'conversations'>('details')
  const [tasks, setTasks] = useState<Task[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingConversations, setLoadingConversations] = useState(false)
  const [newTaskTitle, setNewTaskTitle] = useState('')
  const [newTaskDueDate, setNewTaskDueDate] = useState('')
  const [newNoteContent, setNewNoteContent] = useState('')
  
  // Manage Stages Modal
  const [manageStagesOpen, setManageStagesOpen] = useState(false)
  const [managedStages, setManagedStages] = useState<PipelineStage[]>([])
  const [stageOrderChanged, setStageOrderChanged] = useState(false)
  const [savingOrder, setSavingOrder] = useState(false)
  const [addingNewStage, setAddingNewStage] = useState(false)
  const [newStageName, setNewStageName] = useState('')
  const [newStageColor, setNewStageColor] = useState('#6366f1')
  const [editingStageInModal, setEditingStageInModal] = useState<string | null>(null)
  const [editStageName, setEditStageName] = useState('')
  const [editStageColor, setEditStageColor] = useState('')

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const colors = [
    '#6366f1', '#8b5cf6', '#ec4899', '#ef4444', 
    '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#06b6d4', '#3b82f6', '#6b7280', '#000000'
  ]

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    organizeContactsIntoColumns()
  }, [stages, contacts])

  const fetchData = async () => {
    try {
      // First fetch stages
      const stagesRes = await fetch('/api/stages')
      const stagesData = await stagesRes.json()
      const fetchedStages = stagesData.stages || []
      setStages(fetchedStages)

      // Then fetch only contacts with valid recruitment stages
      const stageIds = fetchedStages.map((s: PipelineStage) => s.id)
      const contactsRes = await fetch('/api/contacts/recruitment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIds }),
      })
      const contactsData = await contactsRes.json()
      setContacts(contactsData.contacts || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const organizeContactsIntoColumns = () => {
    const newColumns: KanbanColumn[] = stages.map(stage => ({
      id: stage.id,
      title: stage.name,
      color: stage.color,
      contacts: contacts.filter(c => c.recruitmentStage === stage.id),
    }))
    setColumns(newColumns)
  }

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const contact = contacts.find(c => c.id === active.id)
    setActiveContact(contact || null)
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveContact(null)

    if (!over) return

    const contactId = active.id as string
    const newStageId = over.id as string

    // Check if dropping on a valid stage
    const targetStage = stages.find(s => s.id === newStageId)
    if (!targetStage) return

    // Update local state immediately
    const updatedContacts = contacts.map(contact =>
      contact.id === contactId
        ? { ...contact, recruitmentStage: newStageId }
        : contact
    )
    setContacts(updatedContacts)

    // Update in database
    try {
      await fetch(`/api/contacts/${contactId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStageId }),
      })
    } catch (error) {
      console.error('Error updating contact stage:', error)
      fetchData() // Revert on error
    }
  }

  const openCreateStageDialog = () => {
    setEditingStage(null)
    setStageName('')
    setStageColor('#6366f1')
    setStageDialogOpen(true)
  }

  const openEditStageDialog = (id: string, name: string, color: string) => {
    const stage = stages.find(s => s.id === id)
    if (stage) {
      setEditingStage(stage)
      setStageName(name)
      setStageColor(color)
      setStageDialogOpen(true)
    }
  }

  const handleSaveStage = async () => {
    if (!stageName.trim()) return

    setSaving(true)
    try {
      if (editingStage) {
        // Update existing stage
        await fetch(`/api/stages/${editingStage.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: stageName, color: stageColor }),
        })
      } else {
        // Create new stage
        await fetch('/api/stages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: stageName, color: stageColor }),
        })
      }

      setStageDialogOpen(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving stage:', error)
      alert('Failed to save stage')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStage = async (id: string) => {
    if (!confirm('Delete this stage? Contacts in this stage will be unassigned.')) {
      return
    }

    try {
      await fetch(`/api/stages/${id}`, {
        method: 'DELETE',
      })
      await fetchData()
    } catch (error) {
      console.error('Error deleting stage:', error)
      alert('Failed to delete stage')
    }
  }

  const openImportDialog = () => {
    setImportResult(null)
    setImportDialogOpen(true)
  }

  // Manage Stages Modal Functions
  const openManageStages = () => {
    setManagedStages([...stages])
    setStageOrderChanged(false)
    setAddingNewStage(false)
    setEditingStageInModal(null)
    setManageStagesOpen(true)
  }

  const handleStageReorder = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = managedStages.findIndex(s => s.id === active.id)
    const newIndex = managedStages.findIndex(s => s.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      setManagedStages(arrayMove(managedStages, oldIndex, newIndex))
      setStageOrderChanged(true)
    }
  }

  const handleSaveStageOrder = async () => {
    setSavingOrder(true)
    try {
      const stageIds = managedStages.map(s => s.id)
      await fetch('/api/stages/reorder', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stageIds }),
      })
      setStageOrderChanged(false)
      await fetchData()
    } catch (error) {
      console.error('Error saving stage order:', error)
      alert('Failed to save stage order')
    } finally {
      setSavingOrder(false)
    }
  }

  const handleAddStageInModal = async () => {
    if (!newStageName.trim()) return

    setSaving(true)
    try {
      await fetch('/api/stages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newStageName, color: newStageColor }),
      })
      setNewStageName('')
      setNewStageColor('#6366f1')
      setAddingNewStage(false)
      await fetchData()
      // Refresh managed stages
      const res = await fetch('/api/stages')
      const data = await res.json()
      setManagedStages(data.stages || [])
    } catch (error) {
      console.error('Error adding stage:', error)
      alert('Failed to add stage')
    } finally {
      setSaving(false)
    }
  }

  const handleEditStageInModal = async (stageId: string) => {
    if (!editStageName.trim()) return

    setSaving(true)
    try {
      await fetch(`/api/stages/${stageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editStageName, color: editStageColor }),
      })
      setEditingStageInModal(null)
      await fetchData()
      // Refresh managed stages
      const res = await fetch('/api/stages')
      const data = await res.json()
      setManagedStages(data.stages || [])
    } catch (error) {
      console.error('Error updating stage:', error)
      alert('Failed to update stage')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteStageInModal = async (stage: PipelineStage) => {
    const contactCount = stage.contactCount || 0
    
    if (contactCount > 0) {
      if (!confirm(`This stage has ${contactCount} contact${contactCount > 1 ? 's' : ''}. They will be removed from recruitment. Are you sure?`)) {
        return
      }
    } else {
      if (!confirm('Delete this stage?')) {
        return
      }
    }

    try {
      await fetch(`/api/stages/${stage.id}`, {
        method: 'DELETE',
      })
      await fetchData()
      // Refresh managed stages
      const res = await fetch('/api/stages')
      const data = await res.json()
      setManagedStages(data.stages || [])
    } catch (error) {
      console.error('Error deleting stage:', error)
      alert('Failed to delete stage')
    }
  }

  const startEditStage = (stage: PipelineStage) => {
    setEditingStageInModal(stage.id)
    setEditStageName(stage.name)
    setEditStageColor(stage.color)
  }

  const handleImportFromGHL = async () => {
    setImporting(true)
    setImportResult(null)
    
    try {
      const response = await fetch('/api/recruitment/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pipelineName: 'recruiter' }),
      })

      const data = await response.json()
      setImportResult(data)

      if (data.success) {
        await fetchData()
      }
    } catch (error) {
      console.error('Import error:', error)
      setImportResult({ success: false, error: 'Failed to connect to GHL' })
    } finally {
      setImporting(false)
    }
  }

  const handleContactClick = (contact: Contact) => {
    setSelectedContact(contact)
    setActiveTab('details')
    setTasks([])
    setNotes([])
    setConversations([])
    setNewTaskTitle('')
    setNewTaskDueDate('')
    setNewNoteContent('')
    setContactDialogOpen(true)
    // Load tasks and notes
    fetchTasks(contact.id)
    fetchNotes(contact.id)
  }

  const fetchTasks = async (contactId: string) => {
    setLoadingTasks(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/tasks`)
      const data = await res.json()
      setTasks(data.tasks || [])
    } catch (error) {
      console.error('Error fetching tasks:', error)
    } finally {
      setLoadingTasks(false)
    }
  }

  const fetchNotes = async (contactId: string) => {
    setLoadingNotes(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/notes`)
      const data = await res.json()
      setNotes(data.notes || [])
    } catch (error) {
      console.error('Error fetching notes:', error)
    } finally {
      setLoadingNotes(false)
    }
  }

  const fetchConversations = async (contactId: string) => {
    setLoadingConversations(true)
    try {
      const res = await fetch(`/api/contacts/${contactId}/conversations`)
      const data = await res.json()
      setConversations(data.conversations || [])
    } catch (error) {
      console.error('Error fetching conversations:', error)
    } finally {
      setLoadingConversations(false)
    }
  }

  const handleAddTask = async () => {
    if (!selectedContact || !newTaskTitle.trim()) return
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          title: newTaskTitle, 
          dueDate: newTaskDueDate || null 
        }),
      })
      const data = await res.json()
      if (data.task) {
        setTasks([data.task, ...tasks])
        setNewTaskTitle('')
        setNewTaskDueDate('')
      }
    } catch (error) {
      console.error('Error adding task:', error)
    }
  }

  const handleToggleTask = async (taskId: string, completed: boolean) => {
    try {
      await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      })
      setTasks(tasks.map(t => t.id === taskId ? { ...t, completed: !completed } : t))
    } catch (error) {
      console.error('Error toggling task:', error)
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    try {
      await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' })
      setTasks(tasks.filter(t => t.id !== taskId))
    } catch (error) {
      console.error('Error deleting task:', error)
    }
  }

  const handleAddNote = async () => {
    if (!selectedContact || !newNoteContent.trim()) return
    try {
      const res = await fetch(`/api/contacts/${selectedContact.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: newNoteContent }),
      })
      const data = await res.json()
      if (data.note) {
        setNotes([data.note, ...notes])
        setNewNoteContent('')
      }
    } catch (error) {
      console.error('Error adding note:', error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    try {
      await fetch(`/api/notes/${noteId}`, { method: 'DELETE' })
      setNotes(notes.filter(n => n.id !== noteId))
    } catch (error) {
      console.error('Error deleting note:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between flex-shrink-0 pb-4">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-muted-foreground">
            Drag and drop contacts between stages
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={openImportDialog}>
            <Download className="mr-2 h-4 w-4" />
            Update Data from GHL
          </Button>
          <Button onClick={openManageStages}>
            <Settings className="mr-2 h-4 w-4" />
            Manage Stages
          </Button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 flex-1 overflow-x-auto overflow-y-hidden">
          {columns.length === 0 ? (
            <div className="w-full text-center py-12">
              <p className="text-muted-foreground text-lg mb-4">
                No pipeline stages yet.
              </p>
              <Button onClick={openCreateStageDialog}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Stage
              </Button>
            </div>
          ) : (
            columns.map((column) => (
              <DroppableColumn 
                key={column.id} 
                column={column}
                onEdit={openEditStageDialog}
                onDelete={handleDeleteStage}
                onContactClick={handleContactClick}
              />
            ))
          )}
        </div>

        <DragOverlay>
          {activeContact ? (
            <div className="bg-white rounded-lg border p-3 shadow-lg rotate-3 w-[280px]">
              <div className="flex items-start gap-2">
                <GripVertical className="h-4 w-4 text-muted-foreground mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-sm">
                    {activeContact.firstName || activeContact.lastName
                      ? `${activeContact.firstName || ''} ${activeContact.lastName || ''}`.trim()
                      : 'No Name'}
                  </h4>
                  {activeContact.email && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                      <Mail className="h-3 w-3" />
                      <span>{activeContact.email}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Manage Stages Modal */}
      <Dialog open={manageStagesOpen} onOpenChange={setManageStagesOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Manage Stages</DialogTitle>
            <DialogDescription>
              Drag to reorder, edit or delete stages
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 flex-1 overflow-y-auto min-h-0">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragEnd={handleStageReorder}
            >
              <SortableContext items={managedStages.map(s => s.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {managedStages.map((stage) => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      isEditing={editingStageInModal === stage.id}
                      editName={editStageName}
                      editColor={editStageColor}
                      colors={colors}
                      saving={saving}
                      onEditNameChange={setEditStageName}
                      onEditColorChange={setEditStageColor}
                      onStartEdit={() => startEditStage(stage)}
                      onSaveEdit={() => handleEditStageInModal(stage.id)}
                      onCancelEdit={() => setEditingStageInModal(null)}
                      onDelete={() => handleDeleteStageInModal(stage)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>

            {/* Add New Stage */}
            {addingNewStage ? (
              <div className="mt-4 p-3 border rounded-lg space-y-3">
                <Input
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  placeholder="Stage name"
                  autoFocus
                />
                <div className="flex gap-2 flex-wrap">
                  {colors.map((color) => (
                    <button
                      key={color}
                      type="button"
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        newStageColor === color ? 'border-black scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setNewStageColor(color)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddStageInModal} disabled={saving || !newStageName.trim()}>
                    {saving ? 'Adding...' : 'Add'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setAddingNewStage(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                variant="outline"
                className="w-full mt-4"
                onClick={() => setAddingNewStage(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Stage
              </Button>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4">
            {stageOrderChanged && (
              <Button onClick={handleSaveStageOrder} disabled={savingOrder}>
                {savingOrder ? 'Saving...' : 'Save Order'}
              </Button>
            )}
            <Button variant="outline" onClick={() => setManageStagesOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stage Dialog */}
      <Dialog open={stageDialogOpen} onOpenChange={setStageDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingStage ? 'Edit Stage' : 'Create New Stage'}
            </DialogTitle>
            <DialogDescription>
              {editingStage 
                ? 'Update the stage name and color'
                : 'Add a new stage to your recruitment pipeline'
              }
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stageName">Stage Name</Label>
              <Input
                id="stageName"
                value={stageName}
                onChange={(e) => setStageName(e.target.value)}
                placeholder="e.g., Initial Contact, Interview, Offer"
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 transition-all ${
                      stageColor === color ? 'border-black scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setStageColor(color)}
                  />
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStageDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStage} disabled={saving || !stageName.trim()}>
              {saving ? 'Saving...' : editingStage ? 'Update Stage' : 'Create Stage'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Update Data from GoHighLevel</DialogTitle>
            <DialogDescription>
              Sync opportunities from GHL: update existing contacts, add new ones, and sync notes
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {!importResult && !importing && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Download className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">
                    This will sync data from your GHL &quot;CHT Group Agent Recruiter&quot; pipeline:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 list-disc list-inside space-y-1">
                    <li>Update existing contacts (name, email, phone, tags, stage)</li>
                    <li>Add new contacts from GHL</li>
                    <li>Sync opportunity notes</li>
                    <li>Remove contacts no longer in pipeline</li>
                  </ul>
                </div>
              </div>
            )}

            {importing && (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center animate-pulse">
                  <Download className="h-8 w-8 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Syncing data from GHL...</p>
                  <p className="text-sm text-muted-foreground">This may take a moment</p>
                </div>
              </div>
            )}

            {importResult && (
              <div className="space-y-4">
                {importResult.success ? (
                  <>
                    <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                      <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-green-600">Sync Successful!</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Pipeline</span>
                        <span className="font-medium">{importResult.pipeline}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Total Opportunities</span>
                        <span className="font-medium">{importResult.totalOpportunities}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contacts Updated</span>
                        <span className="font-medium text-blue-600">{importResult.contactsUpdated}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contacts Added</span>
                        <span className="font-medium text-green-600">{importResult.contactsAdded || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contacts Removed</span>
                        <span className="font-medium text-orange-600">{importResult.contactsRemoved || 0}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Notes Synced</span>
                        <span className="font-medium text-purple-600">{importResult.notesSynced || 0}</span>
                      </div>
                      {(importResult.stagesCreated || 0) > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Stages Created</span>
                          <span className="font-medium text-indigo-600">{importResult.stagesCreated}</span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                      <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </div>
                    <div className="text-center">
                      <p className="font-medium text-red-600">Import Failed</p>
                      <p className="text-sm text-muted-foreground mt-1">{importResult.error}</p>
                    </div>
                    {importResult.availablePipelines && (
                      <div className="bg-muted rounded-lg p-4">
                        <p className="text-sm font-medium mb-2">Available Pipelines:</p>
                        <ul className="text-sm text-muted-foreground space-y-1">
                          {importResult.availablePipelines.map((p, i) => (
                            <li key={i}>• {p}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            {!importResult ? (
              <>
                <Button variant="outline" onClick={() => setImportDialogOpen(false)} disabled={importing}>
                  Cancel
                </Button>
                <Button onClick={handleImportFromGHL} disabled={importing}>
                  {importing ? 'Importing...' : 'Start Import'}
                </Button>
              </>
            ) : (
              <Button onClick={() => setImportDialogOpen(false)}>
                Close
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Contact Detail Dialog - GHL Style */}
      <Dialog open={contactDialogOpen} onOpenChange={setContactDialogOpen}>
        <DialogContent className="sm:max-w-[700px] p-0 gap-0">
          <div className="flex h-[500px]">
            {/* Left Sidebar - Tabs */}
            <div className="w-48 border-r bg-muted/30 p-2 flex flex-col gap-1">
              <button
                onClick={() => setActiveTab('details')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeTab === 'details' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <User className="h-4 w-4" />
                Details
              </button>
              <button
                onClick={() => setActiveTab('tasks')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeTab === 'tasks' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <ListTodo className="h-4 w-4" />
                Tasks
                {tasks.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{tasks.length}</Badge>
                )}
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeTab === 'notes' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <FileText className="h-4 w-4" />
                Notes
                {notes.length > 0 && (
                  <Badge variant="secondary" className="ml-auto text-xs">{notes.length}</Badge>
                )}
              </button>
              <button
                onClick={() => {
                  setActiveTab('conversations')
                  if (selectedContact && conversations.length === 0) {
                    fetchConversations(selectedContact.id)
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm text-left transition-colors ${
                  activeTab === 'conversations' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                Conversations
              </button>
            </div>

            {/* Right Content */}
            <div className="flex-1 flex flex-col">
              {/* Header */}
              <div className="p-4 border-b">
                {selectedContact && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-lg font-semibold text-primary">
                        {(selectedContact.firstName?.[0] || selectedContact.lastName?.[0] || '?').toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {selectedContact.firstName || selectedContact.lastName
                          ? `${selectedContact.firstName || ''} ${selectedContact.lastName || ''}`.trim()
                          : 'No Name'}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {stages.find(s => s.id === selectedContact.recruitmentStage)?.name || 'No Stage'}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Tab Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Details Tab */}
                {activeTab === 'details' && selectedContact && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      {selectedContact.email && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Email</p>
                          <a href={`mailto:${selectedContact.email}`} className="text-sm hover:underline flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            {selectedContact.email}
                          </a>
                        </div>
                      )}
                      {selectedContact.phone && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Phone</p>
                          <a href={`tel:${selectedContact.phone}`} className="text-sm hover:underline flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {selectedContact.phone}
                          </a>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Stage</p>
                        <p className="text-sm font-medium">
                          {stages.find(s => s.id === selectedContact.recruitmentStage)?.name || 'No Stage'}
                        </p>
                      </div>
                      {selectedContact.source && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Source</p>
                          <p className="text-sm">{selectedContact.source}</p>
                        </div>
                      )}
                    </div>

                    {selectedContact.tags && selectedContact.tags.length > 0 && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-2">Tags</p>
                        <div className="flex flex-wrap gap-1">
                          {selectedContact.tags.map((tag, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedContact.dateAdded && (
                      <div className="p-3 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">Date Added</p>
                        <p className="text-sm">{new Date(selectedContact.dateAdded).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Tasks Tab */}
                {activeTab === 'tasks' && (
                  <div className="space-y-4">
                    {/* Add Task Form */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Add a task..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                        className="flex-1"
                      />
                      <Input
                        type="date"
                        value={newTaskDueDate}
                        onChange={(e) => setNewTaskDueDate(e.target.value)}
                        className="w-40"
                      />
                      <Button onClick={handleAddTask} size="sm">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Tasks List */}
                    {loadingTasks ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Loading tasks...</p>
                    ) : tasks.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No tasks yet</p>
                    ) : (
                      <div className="space-y-2">
                        {tasks.map((task) => (
                          <div
                            key={task.id}
                            className={`flex items-start gap-3 p-3 rounded-lg border ${
                              task.completed ? 'bg-muted/50' : 'bg-white'
                            }`}
                          >
                            <button
                              onClick={() => handleToggleTask(task.id, task.completed)}
                              className="mt-0.5"
                            >
                              {task.completed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <Circle className="h-5 w-5 text-muted-foreground" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${task.completed ? 'line-through text-muted-foreground' : ''}`}>
                                {task.title}
                              </p>
                              {task.dueDate && (
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(task.dueDate).toLocaleDateString()}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-muted-foreground hover:text-red-500"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-4">
                    {/* Add Note Form */}
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Add a note..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        rows={3}
                      />
                      <Button onClick={handleAddNote} size="sm" className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Note
                      </Button>
                    </div>

                    {/* Notes List */}
                    {loadingNotes ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Loading notes...</p>
                    ) : notes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No notes yet</p>
                    ) : (
                      <div className="space-y-3">
                        {notes.map((note) => (
                          <div key={note.id} className="p-3 rounded-lg border bg-white">
                            <div className="flex justify-between items-start gap-2">
                              <p className="text-sm whitespace-pre-wrap flex-1">{note.content}</p>
                              <button
                                onClick={() => handleDeleteNote(note.id)}
                                className="text-muted-foreground hover:text-red-500 flex-shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(note.createdAt).toLocaleString()}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Conversations Tab */}
                {activeTab === 'conversations' && (
                  <div className="space-y-4">
                    {loadingConversations ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Loading conversations from GHL...</p>
                    ) : conversations.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8">No conversations found</p>
                    ) : (
                      <div className="space-y-4">
                        {conversations.map((conv) => (
                          <div key={conv.id} className="border rounded-lg overflow-hidden">
                            <div className="bg-muted px-3 py-2 text-xs font-medium flex items-center gap-2">
                              <MessageSquare className="h-3 w-3" />
                              {conv.type === 'TYPE_EMAIL' ? 'Email' : conv.type === 'TYPE_SMS' ? 'SMS' : conv.type}
                              {conv.lastMessageDate && (
                                <span className="text-muted-foreground ml-auto">
                                  Last: {new Date(conv.lastMessageDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              {conv.messages.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-4">No messages</p>
                              ) : (
                                <div className="p-3 space-y-3">
                                  {conv.messages.map((msg) => (
                                    <div
                                      key={msg.id}
                                      className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}
                                    >
                                      <div
                                        className={`max-w-[80%] rounded-lg px-3 py-2 ${
                                          msg.direction === 'outbound'
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted'
                                        }`}
                                      >
                                        {msg.meta?.email?.subject && (
                                          <p className="text-xs font-medium mb-1 opacity-80">
                                            Subject: {msg.meta.email.subject}
                                          </p>
                                        )}
                                        <p className="text-sm whitespace-pre-wrap">{msg.body}</p>
                                        <p className={`text-xs mt-1 ${
                                          msg.direction === 'outbound' ? 'opacity-70' : 'text-muted-foreground'
                                        }`}>
                                          {new Date(msg.dateAdded).toLocaleString()}
                                          {msg.direction === 'outbound' && (
                                            <span className="ml-2">
                                              {msg.status === 'sent' ? '✓' : msg.status === 'delivered' ? '✓✓' : ''}
                                            </span>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-4 border-t flex justify-end">
                <Button variant="outline" onClick={() => setContactDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
