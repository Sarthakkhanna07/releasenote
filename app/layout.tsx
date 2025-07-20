import './globals.css'
import '@/components/editor/prism-theme.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ErrorBoundary } from '@/components/error-boundary'
import { PrismLoader } from '@/components/editor/prism-loader'
import { initializeDatabaseOptimization } from '@/lib/database-config'
import '@/lib/startup-validation' // Run startup validation
import AuthInitializer from '@/components/AuthInitializer';

const inter = Inter({ subsets: ['latin'] })

// Initialize database optimization on server startup
if (typeof window === 'undefined') {
  initializeDatabaseOptimization()
}

export const metadata: Metadata = {
  title: 'Release Notes Generator',
  description: 'Generate and manage release notes for your software projects',
}

import { SpeedInsights } from "@vercel/speed-insights/next";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
      </head>
      <body className={inter.className}>
        <PrismLoader />
        <ErrorBoundary>
          <AuthInitializer />
          {children}
        </ErrorBoundary>
        <SpeedInsights />
      </body>
    </html>
  )
} 