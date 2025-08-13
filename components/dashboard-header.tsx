'use client'

import { Bell, Search, User, Menu, LogOut, CheckCircle } from 'lucide-react'
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
        console.log('DashboardHeader: Fetching gateway info from API');
        const response = await fetch('/api/ar-io-gateway/info');
        console.log('DashboardHeader: API response status', response.status, response.statusText);
        if (response.ok) {
          const data = await response.json();
          console.log('DashboardHeader: API response data', data);
          if (data.available && data.info) {
            setGatewayVersion(data.info.release || 'Unknown');
            console.log('DashboardHeader: setGatewayVersion', data.info.release || 'Unknown');
          } else {
            console.warn('DashboardHeader: Gateway not available', data.error || 'No error info');
            setGatewayVersion('Unavailable');
          }
        } else {
          console.error('DashboardHeader: API fetch failed', response.status, response.statusText);
          setGatewayVersion('Error');
        }
      } catch (error) {
        console.error('Failed to fetch gateway version:', error);
        setGatewayVersion('Error');
      }
    };
    fetchGatewayVersion();
    
    // Refresh every 60 seconds
    const interval = setInterval(fetchGatewayVersion, 60000);
    return () => clearInterval(interval);
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
    const interval = setInterval(fetchNotifications, 5000); // Poll every 5 seconds for faster updates
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
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 icon-info h-4 w-4" />
            <Input 
              placeholder="Search services..." 
              className="pl-10 w-64 form-input"
            />
          </div>
          
          
          <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="relative text-white hover:bg-gray-800">
                <Bell className="h-4 w-4" />
                {unreadNotificationsCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs bg-white text-black flex items-center justify-center">
                    {unreadNotificationsCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-gray-900 border-gray-700">
              <DropdownMenuLabel className="text-white">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-gray-700" />
              <div className="max-h-64 overflow-y-auto">
                {notifications.length > 0 ? (
                  notifications.map((notification) => (
                    <DropdownMenuItem key={notification.id} className={`text-white focus:bg-gray-700 focus:text-white data-[highlighted]:bg-gray-700 data-[highlighted]:text-white flex-col items-start p-3 ${notification.read ? 'opacity-60' : 'font-medium'}`}>
                      <div className="text-sm text-white">
                        {notification.message}
                      </div>
                      <div className="text-xs text-gray-300 mt-1">{notification.time}</div>
                    </DropdownMenuItem>
                  ))
                ) : (
                  <DropdownMenuItem className="text-gray-400 justify-center">
                    No new notifications
                  </DropdownMenuItem>
                )}
              </div>
              <DropdownMenuSeparator className="bg-gray-700" />
              <DropdownMenuItem className="text-white hover:bg-gray-800 justify-center">
                <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} disabled={unreadNotificationsCount === 0}>
                  <CheckCircle className="h-4 w-4 mr-2" />
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
                className="text-white hover:bg-gray-800"
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
