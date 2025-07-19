'use client'
import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { 
  HomeIcon, 
  DocumentTextIcon, 
  Cog6ToothIcon, 
  PencilIcon, 
  EyeIcon, 
  UserGroupIcon,
  ArrowLeftOnRectangleIcon
} from '@heroicons/react/24/outline'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Release Notes', href: '/dashboard/releases', icon: DocumentTextIcon },
  { name: 'Configuration', href: '/dashboard/configuration', icon: Cog6ToothIcon },
  { name: 'AI Context', href: '/dashboard/ai-context', icon: PencilIcon },
  { name: 'Integrations', href: '/dashboard/integrations', icon: UserGroupIcon },
  { name: 'Templates', href: '/dashboard/templates', icon: EyeIcon },
  { name: 'Support & Help', href: 'mailto:help@releasenote.ai', icon: UserGroupIcon },
  { name: 'Settings', href: '/dashboard/settings', icon: Cog6ToothIcon },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname();
  const user = useAuthStore(state => state.user);
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Static sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-56 lg:flex-col bg-white border-r border-neutral-200">
        <div className="flex flex-col h-full justify-between py-6">
          <div>
            <div className="px-6 mb-6 pb-3 border-b border-neutral-100 shadow-sm bg-white">
              <span className="block text-xl font-bold text-neutral-900">ReleaseNoteAI</span>
            </div>
            <nav>
              <ul className="flex flex-col gap-y-2 px-4">
                {navigation.map((item) => (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-2 rounded-xl font-medium text-base transition
                        ${pathname === item.href
                          ? 'bg-neutral-100 text-neutral-800'
                          : 'text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900'}
                      `}
                    >
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div className="border-t border-neutral-100 mt-8 pt-4 px-6 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-neutral-200 flex items-center justify-center text-neutral-500 font-semibold text-base">
              {((user?.user_metadata?.full_name || user?.email || 'U').split(' ').map(n => n[0]).join('')).toUpperCase()}
            </div>
            <span className="text-neutral-800 font-medium text-base">
              {user?.user_metadata?.full_name || user?.email || 'User'}
            </span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <main className="py-0 px-8 w-full flex flex-col items-start gap-8 lg:pl-56">
        {children}
      </main>
    </div>
  )
} 