'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Mail, Phone, Loader2 } from 'lucide-react'
import Link from 'next/link'

interface PipelineStage {
  id: string
  name: string
  color: string
  order: number
  count: number
}

interface DashboardStats {
  contacts: {
    total: number
    withEmail: number
    withPhone: number
  }
  pipeline: {
    total: number
    stages: PipelineStage[]
  }
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/dashboard/stats')
      const data = await res.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching dashboard stats:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const maxStageCount = stats?.pipeline.stages.reduce((max, stage) => Math.max(max, stage.count), 0) || 1

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
        <p className="text-muted-foreground">
          Overview of your contacts and recruitment pipeline.
        </p>
      </div>

      {/* Contact Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.contacts.total.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.contacts.withEmail.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">With Phone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats?.contacts.withPhone.toLocaleString() || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recruitment Pipeline */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recruitment Pipeline</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {stats?.pipeline.total || 0} contacts in pipeline
              </p>
            </div>
            <Link 
              href="/dashboard/recruitment" 
              className="text-sm text-primary hover:underline"
            >
              View Pipeline →
            </Link>
          </div>
        </CardHeader>
        <CardContent className="pb-4">
          {stats?.pipeline.stages.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pipeline stages configured</p>
          ) : (
            <div className="overflow-x-auto pb-2">
              <div className="flex gap-3" style={{ minWidth: 'max-content' }}>
                {stats?.pipeline.stages.map((stage) => (
                  <div 
                    key={stage.id} 
                    className="p-3 rounded-lg border bg-card hover:shadow-md transition-shadow min-w-[140px]"
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <div 
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: stage.color }}
                      />
                      <span className="text-xs font-medium truncate">{stage.name}</span>
                    </div>
                    <div className="text-xl font-bold">{stage.count}</div>
                    {/* Progress bar */}
                    <div className="mt-1.5 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all"
                        style={{ 
                          backgroundColor: stage.color,
                          width: `${(stage.count / maxStageCount) * 100}%`
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
