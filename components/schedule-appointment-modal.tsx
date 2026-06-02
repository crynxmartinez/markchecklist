'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Calendar, Clock, Loader2 } from 'lucide-react'

interface GHLCalendar {
  id: string
  name: string
  description?: string
}

interface TimeSlot {
  start: string
  end: string
}

interface ScheduleAppointmentModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  contactId: string
  contactName: string
  onAppointmentCreated?: () => void
}

export function ScheduleAppointmentModal({
  open,
  onOpenChange,
  contactId,
  contactName,
  onAppointmentCreated
}: ScheduleAppointmentModalProps) {
  const [calendars, setCalendars] = useState<GHLCalendar[]>([])
  const [selectedCalendar, setSelectedCalendar] = useState<string>('')
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  
  const [loadingCalendars, setLoadingCalendars] = useState(false)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch calendars on mount
  useEffect(() => {
    if (open) {
      fetchCalendars()
      // Set default date to tomorrow
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      setSelectedDate(tomorrow.toISOString().split('T')[0])
    }
  }, [open])

  // Fetch slots when calendar or date changes
  useEffect(() => {
    if (selectedCalendar && selectedDate) {
      fetchSlots()
    }
  }, [selectedCalendar, selectedDate])

  const fetchCalendars = async () => {
    setLoadingCalendars(true)
    setError(null)
    try {
      const res = await fetch('/api/ghl/calendars')
      const data = await res.json()
      if (data.error) {
        setError(data.error)
      } else {
        setCalendars(data.calendars || [])
        if (data.calendars?.length > 0) {
          setSelectedCalendar(data.calendars[0].id)
        }
      }
    } catch (err) {
      setError('Failed to load calendars')
      console.error('Error fetching calendars:', err)
    } finally {
      setLoadingCalendars(false)
    }
  }

  const fetchSlots = async () => {
    if (!selectedCalendar || !selectedDate) return
    
    setLoadingSlots(true)
    setAvailableSlots([])
    setSelectedSlot(null)
    
    try {
      // Get slots for the selected date (start and end same day)
      const startDate = selectedDate
      const endDate = selectedDate
      
      const res = await fetch(
        `/api/ghl/calendars/${selectedCalendar}/slots?startDate=${startDate}&endDate=${endDate}`
      )
      const data = await res.json()
      
      if (data.error) {
        console.error('Slots error:', data.error)
        setAvailableSlots([])
      } else {
        // Parse slots from GHL response
        // GHL returns: { slots: { "2025-12-15": { slots: ["09:00", "10:00"] } } }
        // or { slots: { "2025-12-15": ["09:00", "10:00"] } }
        const slotsData = data.slots || {}
        let parsedSlots: TimeSlot[] = []
        
        // Check different possible structures
        if (slotsData[selectedDate]) {
          const daySlots = slotsData[selectedDate]
          if (Array.isArray(daySlots)) {
            parsedSlots = daySlots.map((time: string) => ({
              start: `${selectedDate}T${time}:00`,
              end: `${selectedDate}T${addHour(time)}:00`
            }))
          } else if (daySlots.slots && Array.isArray(daySlots.slots)) {
            parsedSlots = daySlots.slots.map((time: string) => ({
              start: `${selectedDate}T${time}:00`,
              end: `${selectedDate}T${addHour(time)}:00`
            }))
          }
        } else if (Array.isArray(slotsData)) {
          parsedSlots = slotsData
        }
        
        setAvailableSlots(parsedSlots)
      }
    } catch (err) {
      console.error('Error fetching slots:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  const addHour = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number)
    const newHours = (hours + 1) % 24
    return `${newHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  const handleSchedule = async () => {
    if (!selectedCalendar || !selectedSlot) return
    
    setCreating(true)
    setError(null)
    
    try {
      const res = await fetch(`/api/contacts/${contactId}/appointments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: selectedCalendar,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          title: title || `Appointment with ${contactName}`,
          notes
        })
      })
      
      const data = await res.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        onOpenChange(false)
        onAppointmentCreated?.()
        // Reset form
        setSelectedSlot(null)
        setTitle('')
        setNotes('')
      }
    } catch (err) {
      setError('Failed to create appointment')
      console.error('Error creating appointment:', err)
    } finally {
      setCreating(false)
    }
  }

  const formatSlotTime = (slot: TimeSlot) => {
    const date = new Date(slot.start)
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Get min date (today)
  const today = new Date().toISOString().split('T')[0]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Schedule Appointment
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          {/* Contact Info */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Scheduling for:</p>
            <p className="font-medium">{contactName}</p>
          </div>

          {/* Calendar Selection */}
          <div className="space-y-2">
            <Label>Calendar</Label>
            {loadingCalendars ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading calendars...
              </div>
            ) : calendars.length === 0 ? (
              <p className="text-sm text-muted-foreground">No calendars available</p>
            ) : (
              <select
                value={selectedCalendar}
                onChange={(e) => setSelectedCalendar(e.target.value)}
                className="w-full p-2 border rounded-md bg-background"
              >
                {calendars.map((cal) => (
                  <option key={cal.id} value={cal.id}>
                    {cal.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={today}
            />
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Available Times
            </Label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading available times...
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No available times for this date
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-[150px] overflow-y-auto">
                {availableSlots.map((slot, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 text-sm rounded-md border transition-colors ${
                      selectedSlot?.start === slot.start
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    {formatSlotTime(slot)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label>Title (optional)</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Appointment with ${contactName}`}
            />
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any notes..."
              rows={2}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSchedule}
            disabled={!selectedCalendar || !selectedSlot || creating}
          >
            {creating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Scheduling...
              </>
            ) : (
              'Schedule Appointment'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
