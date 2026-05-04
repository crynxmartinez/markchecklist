'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronUp,
} from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const menuItems = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    url: '/dashboard',
    module: null,
  },
  {
    title: 'Recruitment',
    icon: Users,
    url: '/dashboard/recruitment',
    module: 'RECRUITMENT',
  },
  {
    title: 'Truck Management',
    icon: Truck,
    url: '/dashboard/trucks',
    module: 'TRUCK_MANAGEMENT',
  },
  {
    title: 'Analytics',
    icon: BarChart3,
    url: '/dashboard/analytics',
    module: 'ANALYTICS',
  },
  {
    title: 'Settings',
    icon: Settings,
    url: '/dashboard/settings',
    module: null,
  },
]

interface AppSidebarProps {
  user: {
    name: string
    email: string
    role: string
    modules: string[]
  }
}

export function AppSidebar({ user }: AppSidebarProps) {
  const router = useRouter()

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  const filteredMenuItems = menuItems.filter(
    (item) => !item.module || user.modules.includes(item.module)
  )

  const initials = user.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-6 py-4">
        <h2 className="text-lg font-bold">CHT System</h2>
        <p className="text-xs text-muted-foreground">Management Dashboard</p>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredMenuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <a href={item.url}>
                    <SidebarMenuButton>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </a>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t p-4">
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-3 w-full rounded-lg hover:bg-accent p-2 transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left text-sm">
                <p className="font-medium">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
              </div>
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-56">
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Profile</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-red-600">
              <LogOut className="mr-2 h-4 w-4" />
              <span>Logout</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
