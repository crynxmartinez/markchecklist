'use client'

import { useState, useEffect } from 'react'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, closestCorners, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Mail, Phone, GripVertical } from 'lucide-react'

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

interface KanbanColumn {
  id: string
  title: string
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
          {contact.subAccount && (
            <div className="mt-2">
              <Badge variant="outline" className="text-xs">
                {contact.subAccount}
              </Badge>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function KanbanColumnComponent({ column }: { column: KanbanColumn }) {
  return (
    <div className="flex-1 min-w-[300px]">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>{column.title}</span>
            <Badge variant="secondary">{column.contacts.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="min-h-[500px] max-h-[calc(100vh-300px)] overflow-y-auto">
          <SortableContext items={column.contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
            {column.contacts.map((contact) => (
              <ContactCard key={contact.id} contact={contact} />
            ))}
            {column.contacts.length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8">
                No contacts in this stage
              </div>
            )}
          </SortableContext>
        </CardContent>
      </Card>
    </div>
  )
}

export default function RecruitmentPage() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [columns, setColumns] = useState<KanbanColumn[]>([
    { id: 'new', title: 'New Leads', contacts: [] },
    { id: 'contacted', title: 'Contacted', contacts: [] },
    { id: 'qualified', title: 'Qualified', contacts: [] },
    { id: 'interview', title: 'Interview', contacts: [] },
    { id: 'offer', title: 'Offer', contacts: [] },
    { id: 'hired', title: 'Hired', contacts: [] },
  ])
  const [activeContact, setActiveContact] = useState<Contact | null>(null)
  const [loading, setLoading] = useState(true)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  useEffect(() => {
    fetchContacts()
  }, [])

  const fetchContacts = async () => {
    try {
      const response = await fetch('/api/contacts')
      const data = await response.json()
      const fetchedContacts = data.contacts || []
      setContacts(fetchedContacts)
      organizeContactsIntoColumns(fetchedContacts)
    } catch (error) {
      console.error('Error fetching contacts:', error)
    } finally {
      setLoading(false)
    }
  }

  const organizeContactsIntoColumns = (contactsList: Contact[]) => {
    const newColumns = columns.map(col => ({
      ...col,
      contacts: contactsList.filter(c => (c.recruitmentStage || 'new') === col.id)
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
    const newStage = over.id as string

    // Find which column the contact is being dropped into
    const targetColumn = columns.find(col => col.id === newStage)
    if (!targetColumn) return

    // Update local state immediately
    const updatedContacts = contacts.map(contact =>
      contact.id === contactId
        ? { ...contact, recruitmentStage: newStage }
        : contact
    )
    setContacts(updatedContacts)
    organizeContactsIntoColumns(updatedContacts)

    // Update in database
    try {
      await fetch(`/api/contacts/${contactId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage }),
      })
    } catch (error) {
      console.error('Error updating contact stage:', error)
      // Revert on error
      fetchContacts()
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
          <p className="text-muted-foreground">Loading contacts...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Recruitment Pipeline</h1>
        <p className="text-muted-foreground">
          Drag and drop contacts between stages to manage your recruitment pipeline
        </p>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-4">
          {columns.map((column) => (
            <SortableContext key={column.id} items={column.contacts.map(c => c.id)} strategy={verticalListSortingStrategy}>
              <div
                data-column-id={column.id}
                className="flex-1 min-w-[300px]"
              >
                <KanbanColumnComponent column={column} />
              </div>
            </SortableContext>
          ))}
        </div>

        <DragOverlay>
          {activeContact ? (
            <div className="bg-white rounded-lg border p-3 shadow-lg rotate-3">
              <ContactCard contact={activeContact} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
