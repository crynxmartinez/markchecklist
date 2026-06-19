'use client'

import * as React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  User,
  ChevronUp,
  ChevronRight,
  MessageSquare,
  Receipt,
  Home,
  Share2,
  DollarSign,
  UserCog,
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
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

type IconType = React.ComponentType<{ className?: string }>

interface SubMenuItem {
  title: string
  url: string
  icon: IconType
}

interface MenuItem {
  title: string
  icon: IconType
  url?: string
  module: string | null
  children?: SubMenuItem[]
}

const menuItems: MenuItem[] = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    url: '/dashboard',
    module: null,
  },
  {
    title: 'Transaction',
    icon: Receipt,
    module: null,
    children: [
      {
        title: 'Transaction Dashboard',
        url: '/dashboard/transaction',
        icon: LayoutDashboard,
      },
      {
        title: 'Transactions',
        url: '/dashboard/transaction/transactions',
        icon: Receipt,
      },
      {
        title: 'Listings',
        url: '/dashboard/transaction/listings',
        icon: Home,
      },
      {
        title: 'Referrals',
        url: '/dashboard/transaction/referrals',
        icon: Share2,
      },
      {
        title: 'Reimbursements',
        url: '/dashboard/transaction/reimbursements',
        icon: DollarSign,
      },
      {
        title: 'Agents',
        url: '/dashboard/transaction/agents',
        icon: UserCog,
      },
    ],
  },
  {
    title: 'Recruitment',
    icon: Users,
    url: '/dashboard/recruitment',
    module: 'RECRUITMENT',
  },
  {
    title: 'Conversations',
    icon: MessageSquare,
    url: '/dashboard/conversations',
    module: null,
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
  {
    title: 'CHT Contact Database',
    icon: Users,
    url: '/dashboard/contacts',
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
  const pathname = usePathname()
  const [openGroups, setOpenGroups] = React.useState<Record<string, boolean>>(
    {}
  )

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
              {filteredMenuItems.map((item) => {
                if (item.children) {
                  const isOpen =
                    openGroups[item.title] ??
                    item.children.some((child) => pathname === child.url)
                  return (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [item.title]: !isOpen,
                          }))
                        }
                      >
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                        <ChevronRight
                          className={`ml-auto h-4 w-4 transition-transform ${
                            isOpen ? 'rotate-90' : ''
                          }`}
                        />
                      </SidebarMenuButton>
                      {isOpen && (
                        <SidebarMenuSub>
                          {item.children.map((child) => (
                            <SidebarMenuSubItem key={child.title}>
                              <SidebarMenuSubButton
                                href={child.url}
                                isActive={pathname === child.url}
                              >
                                <child.icon className="h-4 w-4" />
                                <span>{child.title}</span>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          ))}
                        </SidebarMenuSub>
                      )}
                    </SidebarMenuItem>
                  )
                }
                return (
                  <SidebarMenuItem key={item.title}>
                    <a href={item.url}>
                      <SidebarMenuButton isActive={pathname === item.url}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </a>
                  </SidebarMenuItem>
                )
              })}
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
