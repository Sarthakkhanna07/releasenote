'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/lib/store'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { GitHubReleaseGenerator } from '@/components/features/GitHubReleaseGenerator'
import { JiraReleaseGenerator } from '@/components/features/JiraReleaseGenerator'
import { handleApiError } from '@/lib/error-handler-standard'

// Subframe UI Components
import { DefaultPageLayout } from '@/subframe-ui/layouts/DefaultPageLayout'
import { Tabs } from '@/subframe-ui/components/Tabs'
import { Badge } from '@/subframe-ui/components/Badge'
import { TextField } from '@/subframe-ui/components/TextField'
import { Button } from '@/subframe-ui/components/Button'
import { Checkbox } from '@/subframe-ui/components/Checkbox'
import { TextArea } from '@/subframe-ui/components/TextArea'
import {
  FeatherGitBranch,
  FeatherGithub,
  FeatherTrello,
  FeatherRefreshCw,
} from '@subframe/core'

// Define the Jira ticket type
type JiraTicket = {
  id: string
  key: string
  title: string
  description: string
  status: string
  type: string
  priority: string
  url: string
  assignee?: string
  created: string
  updated: string
}

// Define the Jira integration type
type JiraIntegration = {
  id: string
  type: 'jira'
  config: {
    domain: string
    projectKey: string
    filters?: {
      status?: string
      lookbackDays?: number
    }
  }
}

// Define the form schema
const releaseNotesSchema = z.object({
  integrationId: z.string().min(1, 'Please select a Jira integration'),
  projectKey: z.string().min(1, 'Please select a Jira project'),
  status: z.enum(['open', 'closed', 'all']),
  lookbackDays: z
    .number()
    .min(1, 'Must be at least 1 day')
    .max(365, 'Cannot exceed 365 days'),
  title: z.string().min(1, 'Please enter a title for your release notes'),
  description: z.string().optional(),
})

type ReleaseNotesFormData = z.infer<typeof releaseNotesSchema>

// Renamed function to reflect its purpose
export default function AIReleaseNotePage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'github' | 'jira'>('github')

  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full flex-col items-start">
        <div className="flex w-full flex-col items-start gap-6 border-b border-solid border-neutral-border px-8 py-6">
          <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
            <div className="flex items-center gap-3">
              <FeatherGitBranch className="text-heading-1 font-heading-1 text-brand-600" />
              <span className="text-heading-1 font-heading-1 text-brand-600">
                Generate Release Notes
              </span>
            </div>
            <span className="text-heading-3 font-heading-3 text-neutral-500">
              Transform your code changes and tickets into professional release
              notes
            </span>
          </div>
          <div className="flex w-full flex-col items-start gap-4">
            <span className="text-body-bold font-body-bold text-default-font">
              Choose Integration Source
            </span>
            <Tabs className="h-auto w-full max-w-[448px] flex-none">
              <Tabs.Item
                active={activeTab === 'github'}
                icon={<FeatherGithub />}
                onClick={() => setActiveTab('github')}
              >
                GitHub
              </Tabs.Item>
              <Tabs.Item
                active={activeTab === 'jira'}
                icon={<FeatherTrello />}
                onClick={() => setActiveTab('jira')}
              >
                Jira
              </Tabs.Item>
            </Tabs>
          </div>
        </div>
        <div className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-start gap-8 bg-default-background py-12 overflow-auto">
          <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
            {activeTab === 'github' ? (
              <GitHubReleaseGenerator />
            ) : (
              <JiraReleaseGenerator />
            )}
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  )
}