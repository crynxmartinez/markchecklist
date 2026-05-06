'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors, useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, Phone, GripVertical, Plus, Trash2, Edit, MoreVertical } from 'lucide-react'
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
  recruitmentStage?: string
  subAccount?: string
}

interface PipelineStage {
  id: string
  name: string
  order: number
  color: string
}

interface KanbanColumn {
  id: string
  title: string
  color: string
  contacts: Contact[]
}

function ContactCard({ contact }: { contact: Contact }) {
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg border p-3 mb-2 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-start gap-2">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate">
            {contact.firstName || contact.lastName
              ? `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
              : 'No Name'}
          </h4>
          {contact.email && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Mail className="h-3 w-3" />
              <span className="truncate">{contact.email}</span>
            </div>
          )}
          {contact.phone && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
              <Phone className="h-3 w-3" />
              <span>{contact.phone}</span>
            </div>
          )}
          {contact.tags && contact.tags.length > 0 && (
            <div className="flex gap-1 mt-2 flex-wrap">
              {contact.tags.slice(0, 2).map((tag, idx) => (
                <Badge key={idx} variant="secondary" className="text-xs">
                  {tag}
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

function DroppableColumn({ column, onEdit, onDelete }: { 
  column: KanbanColumn
  onEdit: (id: string, name: string, color: string) => void
  onDelete: (id: string) => void 
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
  })

  return (
    <div className="flex-shrink-0 w-[300px]">
      <Card className={isOver ? 'ring-2 ring-primary' : ''}>
        <CardHeader className="pb-3">
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
          className="min-h-[400px] max-h-[calc(100vh-300px)] overflow-y-auto"
        >
          <SortableContext items={column.contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {column.contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
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
      const [stagesRes, contactsRes] = await Promise.all([
        fetch('/api/stages'),
        fetch('/api/contacts'),
      ])

      const stagesData = await stagesRes.json()
      const contactsData = await contactsRes.json()

      setStages(stagesData.stages || [])
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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-muted-foreground">
            Drag and drop contacts between stages
          </p>
        </div>
        <Button onClick={openCreateStageDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Add Stage
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
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
    </div>
  )
}
