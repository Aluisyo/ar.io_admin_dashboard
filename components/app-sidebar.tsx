'use client'

import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { LayoutDashboard, Server, Eye, Network, Heart, Database, Zap, BarChart3, Cpu, Package, Gauge, Upload, HardDrive, Activity } from 'lucide-react'
import { ChevronDown } from 'lucide-react'
import Image from 'next/image'
import { AR_IO_LOGO_BASE64 } from '@/lib/constants'

interface AppSidebarProps {
  activeSection: string
  onSectionChange: (section: string, service?: string) => void
}

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const coreServices = [
    { id: 'gateway', name: 'Gateway', icon: Server },
    { id: 'observer', name: 'Observer', icon: Eye },
    { id: 'envoy', name: 'Envoy', icon: Network },
    { id: 'autoheal', name: 'Autoheal', icon: Heart },
  ]

  const services = [
    { id: 'clickhouse', name: 'Clickhouse', icon: Database },
    { id: 'litestream', name: 'Litestream', icon: Zap },
  ]

  const extensions = [
    { id: 'grafana', name: 'Grafana', icon: BarChart3 },
    { id: 'ao-cu', name: 'AO CU', icon: Cpu },
    { id: 'bundler', name: 'Bundler Turbo Service', icon: Package },
    { id: 'admin', name: 'Admin Dashboard', icon: Gauge },
  ]

  return (
    <Sidebar className="border-r border-gray-800">
      <SidebarHeader className="border-b border-gray-800 p-6">
        <div className="flex items-center space-x-3">
          <Image 
            src={AR_IO_LOGO_BASE64}
            alt="AR.IO" 
            width={40} 
            height={40} 
            className="rounded-lg"
          />
          <div>
            <h2 className="text-lg font-bold text-white">ar.io</h2>
            <p className="text-xs text-gray-300">Gateway Admin</p> {/* Adjusted text color */}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton 
                  onClick={() => onSectionChange('dashboard')}
                  isActive={activeSection === 'dashboard'}
                  className="text-white hover:bg-gray-800 data-[active=true]:bg-white data-[active=true]:text-black"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  <span>Dashboard</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between text-gray-300 hover:text-white"> {/* Adjusted text color */}
                Core
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {coreServices.map((service) => (
                    <SidebarMenuItem key={service.id}>
                      <SidebarMenuButton 
                        onClick={() => onSectionChange('service', service.id)}
                        isActive={activeSection === 'service' && service.id === activeSection}
                        className="text-white hover:bg-gray-800 data-[active=true]:bg-white data-[active=true]:text-black"
                      >
                        <service.icon className="h-4 w-4" />
                        <span>{service.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between text-gray-300 hover:text-white"> {/* Adjusted text color */}
                Services
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {services.map((service) => (
                    <SidebarMenuItem key={service.id}>
                      <SidebarMenuButton 
                        onClick={() => onSectionChange('service', service.id)}
                        isActive={activeSection === 'service' && service.id === activeSection}
                        className="text-white hover:bg-gray-800 data-[active=true]:bg-white data-[active=true]:text-black"
                      >
                        <service.icon className="h-4 w-4" />
                        <span>{service.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <Collapsible defaultOpen className="group/collapsible">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between text-gray-300 hover:text-white"> {/* Adjusted text color */}
                Extensions
                <ChevronDown className="ml-auto transition-transform group-data-[state=open]/collapsible:rotate-180" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent>
                <SidebarMenu>
                  {extensions.map((extension) => (
                    <SidebarMenuItem key={extension.id}>
                      <SidebarMenuButton 
                        onClick={() => onSectionChange('service', extension.id)}
                        isActive={activeSection === 'service' && extension.id === activeSection}
                        className="text-white hover:bg-gray-800 data-[active=true]:bg-white data-[active=true]:text-black"
                      >
                        <extension.icon className="h-4 w-4" />
                        <span>{extension.name}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>
    </Sidebar>
  )
}
