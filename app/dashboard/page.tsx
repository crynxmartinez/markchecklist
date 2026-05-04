import { getSession } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Truck, BarChart3, CheckSquare } from 'lucide-react'

export default async function DashboardPage() {
  const session = await getSession()

  const stats = [
    {
      title: 'Total Agents',
      value: '55',
      description: 'Active agents in system',
      icon: Users,
      color: 'text-blue-600',
    },
    {
      title: 'Recruitment Pipeline',
      value: '12',
      description: 'Active candidates',
      icon: CheckSquare,
      color: 'text-green-600',
    },
    {
      title: 'Fleet Vehicles',
      value: '24',
      description: 'Total trucks managed',
      icon: Truck,
      color: 'text-orange-600',
    },
    {
      title: 'Monthly Reports',
      value: '8',
      description: 'Generated this month',
      icon: BarChart3,
      color: 'text-purple-600',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {session?.name}!
        </h2>
        <p className="text-muted-foreground">
          Here's what's happening with your business today.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Your latest system activities</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-blue-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">New agent onboarded</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-green-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Recruitment pipeline updated</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="h-2 w-2 rounded-full bg-orange-600" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Vehicle maintenance scheduled</p>
                  <p className="text-xs text-muted-foreground">1 day ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors">
                <p className="text-sm font-medium">Add New Agent</p>
                <p className="text-xs text-muted-foreground">Start onboarding process</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors">
                <p className="text-sm font-medium">View Recruitment Pipeline</p>
                <p className="text-xs text-muted-foreground">Check candidate status</p>
              </button>
              <button className="w-full text-left p-3 rounded-lg hover:bg-accent transition-colors">
                <p className="text-sm font-medium">Generate Report</p>
                <p className="text-xs text-muted-foreground">Create analytics report</p>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
