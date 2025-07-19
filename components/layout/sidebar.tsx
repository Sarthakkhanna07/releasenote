'use client'

import {
  BarChart2Icon,
  ChevronDownIcon,
  FileHeartIcon,
  LifeBuoyIcon,
  LogOutIcon,
  SearchIcon,
  SettingsIcon,
  StarIcon,
} from "lucide-react"
import React, { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import Image from "next/image"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useAuthStore } from "@/lib/store/use-auth"

export const Sidebar = (): JSX.Element | null => {
  const router = useRouter()
  const pathname = usePathname()
  const [openSections, setOpenSections] = useState<string[]>(['release-notes'])
  const { user, profile, signOut } = useAuthStore()

  // 🚫 If no authenticated user, don't render the sidebar
  if (!user) {
    return null
  }

  const toggleSection = (section: string) => {
    setOpenSections(prev => 
      prev.includes(section) 
        ? prev.filter(s => s !== section)
        : [...prev, section]
    )
  }

  const isActive = (path: string) => {
    if (path === '/dashboard' && (pathname === '/' || pathname === '/dashboard')) {
      return true
    }
    return pathname === path || pathname.startsWith(path)
  }

  // Navigation menu items data
  const menuItems = [
    {
      icon: <StarIcon className="w-6 h-6" />,
      label: "Dashboard",
      path: "/dashboard",
      active: isActive("/dashboard"),
    },
    {
      icon: <FileHeartIcon className="w-6 h-6" />,
      label: "Release Notes",
      hasDropdown: true,
      section: "release-notes",
      active: isActive("/dashboard/releases") || isActive("/release-notes"),
      subItems: [
        { label: "View All", path: "/dashboard/releases" },
        { label: "Create New", path: "/dashboard/releases/new/ai" },
        { label: "From Template", path: "/dashboard/releases/new/template" },
        { label: "From Scratch", path: "/dashboard/releases/new/scratch" },
      ],
    },
    {
      icon: <SettingsIcon className="w-6 h-6" />,
      label: "Configuration",
      path: "/dashboard/configuration",
      active: isActive("/dashboard/configuration"),
    },
    {
      icon: <BarChart2Icon className="w-6 h-6" />,
      label: "AI Context",
      path: "/dashboard/ai-context",
      active: isActive("/dashboard/ai-context"),
    },
    {
      icon: <LifeBuoyIcon className="w-6 h-6" />, // You can change this icon if you prefer another
      label: "Integrations",
      path: "/dashboard/integrations",
      active: isActive("/dashboard/integrations"),
    },
  ]

  // Footer menu items
  const footerItems = [
    {
      icon: <LifeBuoyIcon className="w-6 h-6" />,
      label: "Templates",
      path: "/dashboard/templates",
    },
    {
      icon: <SettingsIcon className="w-6 h-6" />,
      label: "Settings",
      path: "/dashboard/settings",
    },
  ]

  return (
    <div className="flex w-[280px] h-full flex-col bg-white border-r border-[#e4e7ec]">
      <div className="flex flex-col h-full justify-between">
        <div className="flex flex-col gap-6 pt-8">
          <header className="pl-6 pr-5">
            <div className="flex items-center">
              <Image
                src="/rn-logo.svg"
                alt="Release Notes AI"
                width={163}
                height={55}
                priority
                className="h-auto w-auto max-w-[163px] max-h-[55px]"
                onError={() => {
                  console.warn('Sidebar logo failed to load')
                }}
              />
            </div>
          </header>

          <div className="px-6">
            <div className="w-full">
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center w-full px-3.5 py-2.5 bg-white rounded-[10px] border border-solid border-[#d0d5dd] shadow-shadows-shadow-xs">
                  <div className="flex items-center gap-2 w-full">
                    <SearchIcon className="w-5 h-5 text-[#667085]" />
                    <Input
                      className="border-0 shadow-none p-0 h-auto font-text-md-regular text-[#667085] placeholder:text-[#667085] focus-visible:ring-0 focus-visible:ring-offset-0"
                      placeholder="Search"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4">
            <div className="px-2 flex flex-col gap-2">
              {menuItems.map((item, index) =>
                item.hasDropdown ? (
                  <Collapsible 
                    key={index} 
                    className="w-full"
                    open={openSections.includes(item.section!)}
                    onOpenChange={() => toggleSection(item.section!)}
                  >
                    <CollapsibleTrigger className="w-full">
                      <div
                        className={`flex items-center justify-between w-full px-3 py-2 rounded-md ${item.active ? "bg-[#f4ebff]" : "bg-white hover:bg-gray-50"}`}
                      >
                        <div className="flex items-center gap-3">
                          {item.icon}
                          <span
                            className={`${item.active ? "font-text-md-semibold text-[#18212f]" : "font-text-md-medium text-[#667085]"}`}
                          >
                            {item.label}
                          </span>
                        </div>
                        <ChevronDownIcon 
                          className={`w-5 h-5 text-[#667085] transition-transform ${
                            openSections.includes(item.section!) ? 'rotate-180' : ''
                          }`} 
                        />
                      </div>
                    </CollapsibleTrigger>
                    {item.subItems && (
                      <CollapsibleContent>
                        <div className="flex flex-col gap-1.5 mt-1.5 ml-6">
                          {item.subItems.map((subItem, subIndex) => (
                            <Link key={subIndex} href={subItem.path}>
                              <Button
                                variant="ghost"
                                className={`justify-start px-3 py-2 h-auto w-full ${
                                  isActive(subItem.path)
                                    ? "bg-[#f4ebff] font-text-md-semibold text-[#18212f]"
                                    : "font-text-md-medium text-[#667085] hover:bg-gray-100"
                                }`}
                              >
                                {subItem.label}
                              </Button>
                            </Link>
                          ))}
                        </div>
                      </CollapsibleContent>
                    )}
                  </Collapsible>
                ) : (
                  <Link key={index} href={item.path!}>
                    <Button
                      variant="ghost"
                      className={`justify-start w-full px-3 py-2 h-auto ${
                        item.active
                          ? "bg-[#f4ebff] font-text-md-semibold text-[#18212f]"
                          : "bg-white font-text-md-medium text-[#667085] hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-3 w-full">
                        {item.icon}
                        <span>{item.label}</span>
                      </div>
                    </Button>
                  </Link>
                ),
              )}
            </div>
          </div>
        </div>

        <footer className="flex flex-col gap-6 pb-8 px-4">
          <div className="flex flex-col gap-1">
            {footerItems.map((item, index) => (
              <Link key={index} href={item.path}>
                <Button
                  variant="ghost"
                  className={`justify-start w-full px-3 py-2 h-auto ${
                    isActive(item.path)
                      ? "bg-[#f4ebff] font-text-md-semibold text-[#18212f]"
                      : "font-text-md-semibold text-[#344054] hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-start gap-4 pl-2 pr-8 pt-6 relative border-t border-[#e4e7ec]">
            <div className="flex items-center gap-3 flex-1">
              <Avatar className="w-10 h-10 border-[0.75px] border-[#00000014]">
                <AvatarImage 
                  src={profile?.avatar_url || user?.user_metadata?.avatar_url || "/avatar.png"} 
                  alt="User" 
                />
                <AvatarFallback>
                  {profile?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="flex flex-col items-start">
                <span className="font-text-sm-semibold text-[#344054]">
                  {profile?.first_name && profile?.last_name 
                    ? `${profile.first_name} ${profile.last_name}` 
                    : user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                </span>
                <span className="font-normal text-[#475467] text-sm leading-5">
                  {user?.email || 'user@example.com'}
                </span>
              </div>
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="p-2 absolute top-4 right-0"
              onClick={() => signOut()}
              title="Sign out"
            >
              <LogOutIcon className="w-5 h-5" />
            </Button>
          </div>
        </footer>
      </div>
    </div>
  )
}