'use client'

import { useState, useEffect } from 'react'
import { Search, X, ArrowUp, ArrowDown, ArrowUpDown, Edit } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface Agent {
  id: string
  name: string
  email: string
  phone?: string
  status?: string
  leadTeam?: string
  coach?: string
  agentDevelopment?: string
  dre?: string
  dreExpiration?: string
  birthday?: string
  anniversary?: string
  language?: string
  mlsId?: string
  subscription?: string
  tc?: string
  source?: string
  ghlContactId?: string
  createdAt: string
  updatedAt: string
}

interface AgentRosterTabProps {
  onSelectionChange?: (count: number, selectedIds: Set<string>) => void
  onAgentsLoaded?: (count: number) => void
}

export function AgentRosterTab({ onSelectionChange, onAgentsLoaded }: AgentRosterTabProps) {
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(50)
  const [pushing, setPushing] = useState(false)
  const [message, setMessage] = useState('')
  
  // Selection state
  const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set())
  
  // Edit state
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: '',
    leadTeam: '',
    coach: '',
    agentDevelopment: '',
    dre: '',
    dreExpiration: '',
    birthday: '',
    anniversary: '',
    language: '',
    mlsId: '',
    subscription: '',
    tc: '',
    source: '',
  })

  // Sort state
  const [sortConfig, setSortConfig] = useState<{
    key: 'name' | 'status' | 'coach' | 'createdAt' | null
    direction: 'asc' | 'desc' | null
  }>({ key: null, direction: null })

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents')
      const data = await response.json()
      setAgents(data.agents || [])
    } catch (error) {
      console.error('Error fetching agents:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
  }, [])

  // Notify parent of agents loaded
  useEffect(() => {
    if (onAgentsLoaded) {
      onAgentsLoaded(agents.length)
    }
  }, [agents.length, onAgentsLoaded])

  // Notify parent of selection changes
  useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedAgents.size, selectedAgents)
    }
  }, [selectedAgents, onSelectionChange])

  // Search filtering
  const filteredAgents = agents.filter((agent) => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      agent.name.toLowerCase().includes(query) ||
      agent.email.toLowerCase().includes(query) ||
      (agent.phone?.includes(query)) ||
      (agent.coach?.toLowerCase().includes(query)) ||
      (agent.status?.toLowerCase().includes(query))
    )
  })

  // Sorting
  const handleSort = (key: 'name' | 'status' | 'coach' | 'createdAt') => {
    setSortConfig((prev) => {
      if (prev.key !== key) {
        return { key, direction: 'asc' }
      }
      if (prev.direction === 'asc') {
        return { key, direction: 'desc' }
      }
      if (prev.direction === 'desc') {
        return { key: null, direction: null }
      }
      return { key, direction: 'asc' }
    })
    setCurrentPage(1)
  }

  const sortedAgents = [...filteredAgents].sort((a, b) => {
    if (!sortConfig.key || !sortConfig.direction) return 0

    let aValue: string = ''
    let bValue: string = ''

    if (sortConfig.key === 'name') {
      aValue = a.name.toLowerCase()
      bValue = b.name.toLowerCase()
    } else if (sortConfig.key === 'status') {
      aValue = (a.status || '').toLowerCase()
      bValue = (b.status || '').toLowerCase()
    } else if (sortConfig.key === 'coach') {
      aValue = (a.coach || '').toLowerCase()
      bValue = (b.coach || '').toLowerCase()
    } else if (sortConfig.key === 'createdAt') {
      aValue = a.createdAt
      bValue = b.createdAt
    }

    if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
    if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
    return 0
  })

  // Pagination
  const totalPages = Math.ceil(sortedAgents.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentAgents = sortedAgents.slice(startIndex, endIndex)

  const openEditDialog = (agent: Agent) => {
    setEditingAgent(agent)
    setFormData({
      name: agent.name || '',
      email: agent.email || '',
      phone: agent.phone || '',
      status: agent.status || '',
      leadTeam: agent.leadTeam || '',
      coach: agent.coach || '',
      agentDevelopment: agent.agentDevelopment || '',
      dre: agent.dre || '',
      dreExpiration: agent.dreExpiration ? new Date(agent.dreExpiration).toISOString().split('T')[0] : '',
      birthday: agent.birthday || '',
      anniversary: agent.anniversary || '',
      language: agent.language || '',
      mlsId: agent.mlsId || '',
      subscription: agent.subscription || '',
      tc: agent.tc || '',
      source: agent.source || '',
    })
    setEditDialogOpen(true)
  }

  const handleSaveAgent = async () => {
    if (!editingAgent) return
    setSaving(true)
    setMessage('')

    try {
      // Save to CHT database
      const response = await fetch(`/api/agents/${editingAgent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error('Failed to save agent')
      }

      const data = await response.json()
      
      // Update local state
      setAgents(prev => prev.map(a => a.id === editingAgent.id ? data.agent : a))
      setMessage(`Saved ${formData.name} successfully`)
      setEditDialogOpen(false)

      // Also push to GHL if agent has ghlContactId
      if (editingAgent.ghlContactId) {
        try {
          await fetch('/api/agents/push-to-ghl', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ agentIds: [editingAgent.id] }),
          })
          setMessage(`Saved ${formData.name} and synced to GHL`)
        } catch {
          setMessage(`Saved ${formData.name} (GHL sync failed)`)
        }
      }
    } catch (error) {
      console.error('Error saving agent:', error)
      setMessage('Failed to save agent')
    } finally {
      setSaving(false)
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-gray-100 text-gray-800'
      case 'part time': return 'bg-blue-100 text-blue-800'
      case 'processing': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const SortIcon = ({ columnKey }: { columnKey: 'name' | 'status' | 'coach' | 'createdAt' }) => {
    if (sortConfig.key === columnKey) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />
    }
    return <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
  }

  return (
    <div className="space-y-4">
      {/* Search and Actions */}
      <div className="flex items-center justify-between">
        <div className="relative w-[350px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, email, coach, status..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value)
              setCurrentPage(1)
            }}
            className="pl-9 pr-9"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('')
                setCurrentPage(1)
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="text-sm text-muted-foreground">
          {sortedAgents.length} agents
        </div>
      </div>

      {message && (
        <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm">
          {message}
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading agents...</div>
      ) : sortedAgents.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          {searchQuery ? `No agents found matching "${searchQuery}"` : 'No agents found'}
        </div>
      ) : (
        <div className="max-h-[calc(100vh-320px)] overflow-auto border rounded-md">
          <Table>
            <TableHeader className="sticky top-0 bg-background z-10">
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={currentAgents.length > 0 && currentAgents.every(a => selectedAgents.has(a.id))}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        const newSelection = new Set(selectedAgents)
                        currentAgents.forEach(a => newSelection.add(a.id))
                        setSelectedAgents(newSelection)
                      } else {
                        const newSelection = new Set(selectedAgents)
                        currentAgents.forEach(a => newSelection.delete(a.id))
                        setSelectedAgents(newSelection)
                      }
                    }}
                  />
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Name <SortIcon columnKey="name" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status <SortIcon columnKey="status" />
                  </div>
                </TableHead>
                <TableHead 
                  className="cursor-pointer hover:bg-muted/50 select-none"
                  onClick={() => handleSort('coach')}
                >
                  <div className="flex items-center gap-1">
                    Coach <SortIcon columnKey="coach" />
                  </div>
                </TableHead>
                <TableHead>Lead Team</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>DRE</TableHead>
                <TableHead>DRE Exp</TableHead>
                <TableHead>TC</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentAgents.map((agent) => (
                <TableRow 
                  key={agent.id} 
                  className={`hover:bg-muted/50 ${selectedAgents.has(agent.id) ? 'bg-muted/30' : ''}`}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedAgents.has(agent.id)}
                      onCheckedChange={(checked) => {
                        const newSelection = new Set(selectedAgents)
                        if (checked) {
                          newSelection.add(agent.id)
                        } else {
                          newSelection.delete(agent.id)
                        }
                        setSelectedAgents(newSelection)
                      }}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{agent.name}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(agent.status)}>
                      {agent.status || 'N/A'}
                    </Badge>
                  </TableCell>
                  <TableCell>{agent.coach || 'N/A'}</TableCell>
                  <TableCell>
                    {agent.leadTeam && (
                      <Badge variant="outline">{agent.leadTeam}</Badge>
                    )}
                  </TableCell>
                  <TableCell>{agent.phone || 'N/A'}</TableCell>
                  <TableCell className="text-sm">{agent.email}</TableCell>
                  <TableCell className="text-sm font-mono">{agent.dre || 'N/A'}</TableCell>
                  <TableCell className="text-sm">
                    {agent.dreExpiration 
                      ? new Date(agent.dreExpiration).toLocaleDateString() 
                      : 'N/A'}
                  </TableCell>
                  <TableCell>{agent.tc || 'N/A'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {sortedAgents.length > itemsPerPage && (
        <div className="flex items-center justify-between px-2">
          <div className="text-sm text-muted-foreground">
            Showing {startIndex + 1} to {Math.min(endIndex, sortedAgents.length)} of {sortedAgents.length} agents
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span className="text-sm">Page {currentPage} of {totalPages}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Agent</DialogTitle>
            <DialogDescription>
              Update agent information. Changes will be saved to CHT database and synced to GHL.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => value && setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Lead Team</Label>
              <Select
                value={formData.leadTeam}
                onValueChange={(value) => value && setFormData({ ...formData, leadTeam: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select lead team" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Inactive">Inactive</SelectItem>
                  <SelectItem value="Processing">Processing</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Coach</Label>
              <Select
                value={formData.coach}
                onValueChange={(value) => value && setFormData({ ...formData, coach: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select coach" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Kiona Grantham">Kiona Grantham</SelectItem>
                  <SelectItem value="Mario Munoz">Mario Munoz</SelectItem>
                  <SelectItem value="Melissa Perla">Melissa Perla</SelectItem>
                  <SelectItem value="N/A">N/A</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agent Development</Label>
              <Select
                value={formData.agentDevelopment}
                onValueChange={(value) => value && setFormData({ ...formData, agentDevelopment: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>DRE License</Label>
              <Input
                value={formData.dre}
                onChange={(e) => setFormData({ ...formData, dre: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>DRE Expiration</Label>
              <Input
                type="date"
                value={formData.dreExpiration}
                onChange={(e) => setFormData({ ...formData, dreExpiration: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input
                value={formData.birthday}
                onChange={(e) => setFormData({ ...formData, birthday: e.target.value })}
                placeholder="e.g., April 2"
              />
            </div>
            <div className="space-y-2">
              <Label>Anniversary</Label>
              <Input
                value={formData.anniversary}
                onChange={(e) => setFormData({ ...formData, anniversary: e.target.value })}
                placeholder="e.g., 02-23-2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Language</Label>
              <Input
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>MLS ID</Label>
              <Input
                value={formData.mlsId}
                onChange={(e) => setFormData({ ...formData, mlsId: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Subscription</Label>
              <Select
                value={formData.subscription}
                onValueChange={(value) => value && setFormData({ ...formData, subscription: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Yes">Yes</SelectItem>
                  <SelectItem value="No">No</SelectItem>
                  <SelectItem value="Outside">Outside</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>TC (Transaction Coordinator)</Label>
              <Select
                value={formData.tc}
                onValueChange={(value) => value && setFormData({ ...formData, tc: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select TC" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Alexis">Alexis</SelectItem>
                  <SelectItem value="Kenia">Kenia</SelectItem>
                  <SelectItem value="Outside">Outside</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source</Label>
              <Input
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., Referral, FB"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAgent} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
