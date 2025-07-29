'use client'
import React, { useState } from 'react'
import DashboardNavbar from '@/components/navbar/DashboardNavbar'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="flex min-h-screen bg-white">
      <DashboardNavbar collapsed={collapsed} setCollapsed={setCollapsed} />
      <main
        className={`py-0 px-8 w-full flex flex-col items-start gap-8 transition-all duration-300 ${collapsed ? 'lg:pl-20' : 'lg:pl-56'}`}
        style={{ background: '#fff' }}
      >
        {children}
      </main>
    </div>
  )
} 