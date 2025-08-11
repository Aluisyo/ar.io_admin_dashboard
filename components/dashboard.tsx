'use client'

import { useState } from 'react'
import { Sidebar, SidebarContent, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/app-sidebar'
import { DashboardContent } from '@/components/dashboard-content'
import { ServiceTabs } from '@/components/service-tabs'
import { DashboardHeader } from '@/components/dashboard-header'

export function Dashboard() {
  const [activeSection, setActiveSection] = useState('dashboard')
  const [activeService, setActiveService] = useState('')

  return (
    <SidebarProvider>
      <div className="min-h-screen h-screen flex w-full bg-black overflow-hidden">
        <AppSidebar 
          activeSection={activeSection}
          onSectionChange={(section, service) => {
            setActiveSection(section)
            setActiveService(service || '')
          }}
        />
        <main className="flex-1 flex flex-col min-h-0 max-w-full">
          <DashboardHeader />
          <div className="flex-1 p-3 sm:p-6 space-y-4 sm:space-y-6 min-h-0 overflow-y-auto main-content">
            {activeSection === 'dashboard' ? (
              <DashboardContent 
                onSectionChange={(section, service) => { // Pass onSectionChange to DashboardContent
                  setActiveSection(section)
                  setActiveService(service || '')
                }}
              />
            ) : (
              <ServiceTabs service={activeService} />
            )}
          </div>
        </main>
      </div>
    </SidebarProvider>
  )
}
