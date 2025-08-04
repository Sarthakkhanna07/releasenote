'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import {
  HomeIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  PencilIcon,
  EyeIcon,
  UserGroupIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Release Notes', href: '/dashboard/releases', icon: DocumentTextIcon },
  { name: 'Organization', href: '/dashboard/organization', icon: BuildingOfficeIcon },
  { name: 'AI Context', href: '/dashboard/ai-context', icon: PencilIcon },
  { name: 'Integrations', href: '/dashboard/integrations', icon: UserGroupIcon },
  { name: 'Templates', href: '/dashboard/templates', icon: EyeIcon },
  { name: 'Support & Help', href: 'mailto:help@releasenote.ai', icon: UserGroupIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
];

interface DashboardNavbarProps {
  collapsed: boolean;
  setCollapsed: (c: boolean) => void;
}

export default function DashboardNavbar({ collapsed, setCollapsed }: DashboardNavbarProps) {
  const pathname = usePathname();
  const user = useAuthStore(state => state.user);
  const profile = useAuthStore(state => state.profile);

  return (
    <div className={`hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex flex-col bg-white border-r border-neutral-200 transition-all duration-300 ${collapsed ? 'lg:w-20' : 'lg:w-56'}`}
      style={{ transitionProperty: 'width,background-color', transitionTimingFunction: 'ease' }}
    >
      {/* Collapse/Expand Button and Branding */}
      <div className="flex flex-col w-full">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          {!collapsed && <span className="text-xl font-bold text-neutral-900 transition-opacity duration-300">ReleaseNoteAI</span>}
          <button
            className="ml-auto p-1 rounded hover:bg-neutral-100"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRightIcon className="w-6 h-6 text-neutral-500" /> : <ChevronLeftIcon className="w-6 h-6 text-neutral-500" />}
          </button>
        </div>
        {/* Subtle shadow line below branding */}
        <div className="w-full h-[1.5px] bg-gradient-to-r from-transparent via-neutral-200 to-transparent shadow-sm mb-2" />
      </div>
      <div className="flex flex-col h-full justify-between pb-6 transition-all duration-300">
        <nav className="flex-1">
          <ul className="flex flex-col gap-y-2 px-2 mt-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <li key={item.name} className="group relative">
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl font-medium text-base transition-all duration-300 w-full ${
                      isActive
                        ? 'bg-neutral-100 text-neutral-800'
                        : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                  >
                    {collapsed ? (
                      <>
                        <Icon className="w-6 h-6 transition-all duration-300" />
                        <span className="sr-only">{item.name}</span>
                      </>
                    ) : (
                      <span
                        className="transition-all duration-300 overflow-hidden whitespace-nowrap"
                        style={{
                          opacity: collapsed ? 0 : 1,
                          maxWidth: collapsed ? 0 : 200,
                          transition: 'opacity 0.3s ease, max-width 0.3s ease',
                          display: 'inline-block',
                        }}
                      >
                        {item.name}
                      </span>
                    )}
                  </Link>
                  {collapsed && (
                    <span className="absolute left-full top-1/2 -translate-y-1/2 ml-2 whitespace-nowrap rounded bg-neutral-900 text-white text-xs px-2 py-1 opacity-0 group-hover:opacity-100 pointer-events-none z-50 transition-opacity">
                      {item.name}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
        <div className={`border-t border-neutral-100 mt-8 pt-4 px-2 flex items-center gap-3 transition-all duration-300 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
          <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 font-semibold text-base">
            {((profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user?.email || 'U').split(' ').map((n: string) => n[0]).join('')).toUpperCase()}
          </div>
          {!collapsed && (
            <span
              className="text-neutral-800 font-medium text-base transition-all duration-300 overflow-hidden whitespace-nowrap"
              style={{
                opacity: collapsed ? 0 : 1,
                maxWidth: collapsed ? 0 : 200,
                transition: 'opacity 0.3s ease, max-width 0.3s ease',
                display: 'inline-block',
              }}
            >
              {profile?.first_name && profile?.last_name ? `${profile.first_name} ${profile.last_name}` : user?.email || 'User'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
} 