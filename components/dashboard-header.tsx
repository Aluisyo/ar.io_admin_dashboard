'use client'

import { Bell, Search, User, Menu, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { useState, useEffect } from 'react'
import { signOut } from 'next-auth/react'

interface Notification {
  id: number
  message: string
  type: 'warning' | 'success' | 'error'
  time: string
  read: boolean
}

export function DashboardHeader() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showNotifications, setShowNotifications] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [gatewayVersion, setGatewayVersion] = useState<string>('');

  useEffect(() => {
    const fetchGatewayVersion = async () => {
      try {
        const gatewayUrl = localStorage.getItem('ar-io-gateway-url') || 'http://localhost:4000';
        console.log('DashboardHeader: gatewayUrl', gatewayUrl);
        console.log('DashboardHeader: info endpoint', gatewayUrl + '/ar-io/info');
        const response = await fetch(`${gatewayUrl.replace(/\/+$/, '')}/ar-io/info`);
        console.log('DashboardHeader: info fetch status', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          setGatewayVersion(data.release || 'Unknown');
          console.log('DashboardHeader: setGatewayVersion', data.release || 'Unknown');
        } else {
          console.error('DashboardHeader: info fetch failed', response.status, response.statusText);
          setGatewayVersion('Unknown');
        }
      } catch (error) {
        console.error('Failed to fetch gateway version:', error);
        setGatewayVersion('Unknown');
      }
    };
    fetchGatewayVersion();
  }, []);
  const fetchNotifications = async () => {
    try {
      const response = await fetch('/api/notifications')
      if (response.ok) {
        const data: Notification[] = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  useEffect(() => {
    fetchNotifications() // Fetch on mount
    const interval = setInterval(fetchNotifications, 30000); // Poll every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'mark-all-read' }),
      });
      if (response.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        // Also force a re-fetch to make sure we're in sync
        setTimeout(() => {
          fetchNotifications();
        }, 100);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' }) // Redirect to login page after logout
  }

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <header className="bg-black border-b border-gray-800 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="text-white hover:bg-gray-800" />
          <div className="hidden md:block">
            <h1 className="text-xl font-semibold text-white">AR.IO Gateway Admin Dashboard</h1>
             <p className="text-sm text-gray-300">Gateway Node version: {gatewayVersion || 'Loading...'}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="hidden">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-300 h-4 w-4" /> {/* Adjusted text color */}
            <Input 
              placeholder="Search services..." 
              className="pl-10 w-64 bg-gray-900 border-gray-700 text-white placeholder:text-gray-300" // Adjusted placeholder color
            />
          </div>
          
          
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative text-white hover:bg-gray-800">
                <Bell className="h-4 w-4" />
                {unreadNotificationsCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-red-500 flex items-center justify-center">
                    {unreadNotificationsCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-gray-900 border-gray-700">
              <DropdownMenuLabel className="text-white">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              {notifications.length > 0 ? (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id} className={`text-white hover:bg-gray-800 flex-col items-start p-3 ${notification.read ? 'opacity-60' : 'font-medium'}`}>
                    <div className={`text-sm ${
                      notification.type === 'error' ? 'text-red-400' : 
                      notification.type === 'warning' ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {notification.message}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{notification.time}</div>
                  </DropdownMenuItem>
                ))
              ) : (
                <DropdownMenuItem className="text-gray-400 justify-center"> {/* Adjusted text color */}
                  No new notifications
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem className="text-white hover:bg-gray-800 justify-center">
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={unreadNotificationsCount === 0}>
                  Mark All As Read
                </Button>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          
          {/* Settings icon removed */}
          
          <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="text-white hover:bg-gray-800 p-1">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gray-800 text-white">
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-gray-900 border-gray-700">
              <DropdownMenuLabel className="text-white">Admin User</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem className="text-white hover:bg-gray-800">
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="text-white hover:bg-gray-800">
                <Bell className="h-4 w-4 mr-2" />
                Notification Preferences
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem 
                className="text-red-400 hover:bg-gray-800 hover:text-red-300"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
