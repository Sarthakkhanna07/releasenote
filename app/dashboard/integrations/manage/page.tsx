'use client'

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { GitHubRepositoryManager } from '@/components/integrations/github-repository-manager'
import { JiraProjectManager } from '@/components/integrations/jira-project-manager'
import { LinearTeamManager } from '@/components/integrations/linear-team-manager'
import { IntegrationStatus } from '@/components/integrations/integration-status'
import { 
  GitBranchIcon,
  SettingsIcon,
  TestTubeIcon,
  ExternalLinkIcon,
  RefreshCwIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  PlusIcon,
  ArrowLeftIcon
} from 'lucide-react'
import Link from 'next/link'
import { useAuthStore } from '@/lib/store/use-auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { Repository } from '@/components/integrations/github-repository-manager'

interface Integration {
  id: string
  type: string
  provider_user_id: string
  access_token: string
  refresh_token?: string
  expires_at?: string
  created_at: string
  updated_at: string
  last_test_at?: string
  metadata?: any
}

interface ConnectionTest {
  success: boolean
  timestamp: string
  tests: Array<{
    name: string
    status: 'passed' | 'failed' | 'warning' | 'info'
    message: string
    error?: string
    details?: any
  }>
  summary: {
    total: number
    passed: number
    warnings: number
    failed: number
  }
}

export default function IntegrationManagePage() {
  const [activeTab, setActiveTab] = useState('overview')
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [selectedRepositories, setSelectedRepositories] = useState<Repository[]>([])
  const [selectedJiraProjects, setSelectedJiraProjects] = useState<string[]>([])
  const [selectedLinearTeams, setSelectedLinearTeams] = useState<string[]>([])
  const [connectionTest, setConnectionTest] = useState<ConnectionTest | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const { user } = useAuthStore()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user) {
      loadIntegrations()
    }
  }, [user])

  const loadIntegrations = async () => {
    if (!user) return

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', user.id)

      if (error) throw error
      setIntegrations(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const runConnectionTest = async (integrationType: string) => {
    setTesting(true)
    setError(null)

    try {
      const response = await fetch(`/api/integrations/${integrationType}/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(`Test failed: ${response.status} ${response.statusText} - ${errorData.error || ''}`)
      }

      const testResults = await response.json()
      setConnectionTest(testResults)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed')
    } finally {
      setTesting(false)
    }
  }

  const getIntegrationByType = (type: string) => {
    return integrations.find(integration => integration.type === type)
  }

  const getIntegrationStatus = (integration?: Integration) => {
    if (!integration) return 'not_connected'
    
    // Check if token is expired
    if (integration.expires_at) {
      const expiresAt = new Date(integration.expires_at)
      const now = new Date()
      if (expiresAt <= now) return 'expired'
    }

    // Check last test results
    if (connectionTest && !connectionTest.success) return 'error'
    
    return 'connected'
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <span className="bg-green-100 text-green-700 rounded-full px-3 py-1 text-xs font-medium">Connected</span>
      case 'expired':
        return <span className="bg-yellow-100 text-yellow-700 rounded-full px-3 py-1 text-xs font-medium">Token Expired</span>
      case 'error':
        return <span className="bg-red-100 text-red-700 rounded-full px-3 py-1 text-xs font-medium">Error</span>
      default:
        return <span className="bg-neutral-100 text-neutral-700 rounded-full px-3 py-1 text-xs font-medium">Not Connected</span>
    }
  }

  const integrationTypes = [
    {
      type: 'github',
      name: 'GitHub',
      description: 'Connect GitHub for repository data and automated release note generation',
      icon: '🐙',
      features: ['Repository Access', 'Commit History', 'Pull Requests', 'Issues'],
      connectUrl: '/api/auth/github'
    },
    {
      type: 'jira',
      name: 'Jira',
      description: 'Sync tickets and project management data',
      icon: '🔷',
      features: ['Issue Tracking', 'Sprint Data', 'Project Management'],
      connectUrl: '/api/auth/jira',
      comingSoon: false
    },
    {
      type: 'linear',
      name: 'Linear',
      description: 'Import issues and development workflow',
      icon: '📐',
      features: ['Issue Management', 'Project Tracking', 'Team Workflow'],
      connectUrl: '/api/auth/linear',
      comingSoon: false
    }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading integration management...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 w-full min-h-screen flex flex-col bg-neutral-50">
      <div className="flex flex-col items-start gap-6 w-full py-6">
        {/* Header */}
        <div className="w-full px-8">
          <div className="flex items-center justify-between py-4 border-b border-neutral-200">
            <div className="flex items-center gap-6">
              <Link href="/dashboard/integrations">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="flex items-center gap-2 text-neutral-600 hover:text-neutral-900 border-neutral-300 hover:border-neutral-400"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  Back
                </Button>
              </Link>
              <div className="flex flex-col">
                <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight">
                  Integration Management
                </h1>
                <p className="text-sm text-neutral-600 mt-1">
                  Manage your connected services and repository access
                </p>
              </div>
            </div>
            <Link href="/dashboard/integrations">
              <Button 
                size="sm"
                className="bg-black text-white hover:bg-neutral-800 px-4 py-2"
              >
                <PlusIcon className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </Link>
          </div>
        </div>
        {/* Info box for advanced management context */}
        <div className="w-full px-8 mt-4">
          <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <AlertTriangleIcon className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
            <div className="text-sm">
              <span className="font-medium text-blue-900">Advanced Management:</span>
              <span className="text-blue-800 ml-1">
                This page is for detailed configuration, diagnostics, and repository/project management. For most users, the{' '}
                <Link href='/dashboard/integrations' className='underline text-blue-900 hover:text-blue-700 font-medium'>
                  main Integrations page
                </Link>{' '}
                is recommended for everyday use.
              </span>
            </div>
          </div>
        </div>

        {error && (
          <div className="w-full px-8">
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 w-full">
              <div className="flex items-center gap-2">
                <AlertTriangleIcon className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </div>
          </div>
        )}



        <div className="w-full px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                     <TabsList className="grid w-full grid-cols-8 bg-white border border-neutral-200 rounded-lg p-1">
             <TabsTrigger value="overview" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Overview</TabsTrigger>
             <TabsTrigger value="github" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">GitHub</TabsTrigger>
             <TabsTrigger value="jira" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Jira</TabsTrigger>
             <TabsTrigger value="linear" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Linear</TabsTrigger>
             <TabsTrigger value="repositories" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Repositories</TabsTrigger>
             <TabsTrigger value="projects" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Projects</TabsTrigger>
             <TabsTrigger value="teams" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Teams</TabsTrigger>
             <TabsTrigger value="testing" className="data-[state=active]:bg-neutral-100 data-[state=active]:text-neutral-900 text-neutral-700 hover:text-neutral-900">Diagnostics</TabsTrigger>
           </TabsList>

                 {/* Overview Tab */}
         <TabsContent value="overview" className="space-y-4">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
             {integrationTypes.map((integrationType) => {
               const integration = getIntegrationByType(integrationType.type)
               const status = getIntegrationStatus(integration)
               
               return (
                                  <div key={integrationType.type} className="flex flex-col items-start gap-4 bg-white border border-neutral-200 rounded-xl px-6 py-6">
                   <div className="flex items-start justify-between w-full">
                     <div className="flex items-center gap-3">
                       <div className="w-12 h-12 bg-neutral-100 rounded-lg flex items-center justify-center">
                         <span className="text-xl">{integrationType.icon}</span>
                       </div>
                       <div>
                         <span className="text-base font-semibold text-neutral-900">{integrationType.name}</span>
                         <div className="flex items-center gap-2 mt-1">
                           {getStatusBadge(status)}
                           {integrationType.comingSoon && (
                             <span className="bg-neutral-100 text-neutral-700 rounded-full px-3 py-1 text-xs font-medium">Coming Soon</span>
                           )}
                         </div>
                       </div>
                     </div>
                   </div>
                   
                   <div className="space-y-4 w-full">
                     <p className="text-sm text-neutral-600">
                       {integrationType.description}
                     </p>
                     
                     <div className="space-y-2">
                       <p className="text-sm font-medium text-neutral-800">Features:</p>
                       <div className="flex flex-wrap gap-1">
                         {integrationType.features.map((feature) => (
                           <span key={feature} className="bg-neutral-100 text-neutral-800 rounded-full px-3 py-1 text-xs font-medium">
                             {feature}
                           </span>
                         ))}
                       </div>
                     </div>
                     
                     <div className="pt-2 w-full">
                       {integration ? (
                         <div className="space-y-2">
                           <div className="text-xs text-neutral-700">
                             Connected: {new Date(integration.created_at).toLocaleDateString()}
                           </div>
                           <div className="flex gap-2">
                             <Button 
                               variant="outline" 
                               size="sm" 
                               onClick={() => setActiveTab(integrationType.type)}
                               className="bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
                             >
                               <SettingsIcon className="w-4 h-4 mr-2" />
                               Manage
                             </Button>
                             <Button 
                               variant="outline" 
                               size="sm"
                               onClick={() => {
                                 setActiveTab('testing')
                                 runConnectionTest(integrationType.type)
                               }}
                               disabled={testing}
                               className="bg-white text-neutral-800 border-neutral-200 hover:bg-neutral-50"
                             >
                               <TestTubeIcon className="w-4 h-4 mr-2" />
                               Test
                             </Button>
                           </div>
                         </div>
                       ) : (
                         <Button 
                           onClick={() => window.location.href = integrationType.connectUrl}
                           className="w-full bg-black text-white hover:bg-neutral-800"
                           disabled={integrationType.comingSoon}
                         >
                           {integrationType.comingSoon ? 'Coming Soon' : `Connect ${integrationType.name}`}
                         </Button>
                       )}
                     </div>
                   </div>
                 </div>
               )
             })}
           </div>
         </TabsContent>

                 {/* GitHub Tab */}
         <TabsContent value="github" className="space-y-6">
           {getIntegrationByType('github') ? (
             <IntegrationStatus 
               integrationType="github"
               integrationId={getIntegrationByType('github')?.id}
             />
           ) : (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 w-full bg-white border border-neutral-200 rounded-xl px-6 py-6">
                <GitBranchIcon className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                <span className="text-lg font-medium text-neutral-900 mb-2">
                  GitHub Not Connected
                </span>
                <span className="text-neutral-700 mb-4 text-center">
                  Connect your GitHub account to access repositories and generate release notes
                </span>
                <Button onClick={() => window.location.href = '/api/auth/github'} className="bg-black text-white hover:bg-neutral-800">
                  Connect GitHub
                </Button>
              </div>
           )}
         </TabsContent>

                 {/* Jira Tab */}
         <TabsContent value="jira" className="space-y-6">
           {getIntegrationByType('jira') ? (
             <IntegrationStatus 
               integrationType="jira"
               integrationId={getIntegrationByType('jira')?.id}
             />
           ) : (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 w-full bg-white border border-neutral-200 rounded-xl px-6 py-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔷</span>
                </div>
                <span className="text-lg font-medium text-neutral-900 mb-2">
                  Jira Not Connected
                </span>
                <span className="text-neutral-700 mb-4 text-center">
                  Connect your Jira account to access projects and sync tickets
                </span>
                <Button onClick={() => window.location.href = '/api/auth/jira'} className="bg-black text-white hover:bg-neutral-800">
                  Connect Jira
                </Button>
              </div>
           )}
         </TabsContent>

                 {/* Linear Tab */}
         <TabsContent value="linear" className="space-y-6">
           {getIntegrationByType('linear') ? (
             <IntegrationStatus 
               integrationType="linear"
               integrationId={getIntegrationByType('linear')?.id}
             />
           ) : (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 w-full bg-white border border-neutral-200 rounded-xl px-6 py-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📐</span>
                </div>
                <span className="text-lg font-medium text-neutral-900 mb-2">
                  Linear Not Connected
                </span>
                <span className="text-neutral-700 mb-4 text-center">
                  Connect your Linear account to access teams and sync issues
                </span>
                <Button onClick={() => window.location.href = '/api/auth/linear'} className="bg-black text-white hover:bg-neutral-800">
                  Connect Linear
                </Button>
              </div>
           )}
         </TabsContent>

                 {/* Repositories Tab */}
         <TabsContent value="repositories" className="space-y-6">
           {getIntegrationByType('github') ? (
             <GitHubRepositoryManager 
               selectedRepositories={selectedRepositories}
               onRepositorySelect={setSelectedRepositories}
               selectionMode="multiple"
             />
           ) : (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 w-full bg-white border border-neutral-200 rounded-xl px-6 py-6">
                <GitBranchIcon className="w-12 h-12 text-neutral-500 mx-auto mb-4" />
                <span className="text-lg font-medium text-neutral-900 mb-2">
                  Connect GitHub First
                </span>
                <span className="text-neutral-700 mb-4 text-center">
                  You need to connect GitHub to manage repositories
                </span>
                <Button onClick={() => setActiveTab('github')} className="bg-black text-white hover:bg-neutral-800">
                  Go to GitHub Setup
                </Button>
              </div>
           )}
         </TabsContent>

                 {/* Projects Tab (Jira) */}
         <TabsContent value="projects" className="space-y-6">
           {getIntegrationByType('jira') ? (
             <JiraProjectManager 
               selectedProjects={selectedJiraProjects}
               onProjectSelect={setSelectedJiraProjects}
               selectionMode="multiple"
             />
           ) : (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 w-full bg-white border border-neutral-200 rounded-xl px-6 py-6">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🔷</span>
                </div>
                <span className="text-lg font-medium text-neutral-900 mb-2">
                  Connect Jira First
                </span>
                <span className="text-neutral-700 mb-4 text-center">
                  You need to connect Jira to manage projects
                </span>
                <Button onClick={() => setActiveTab('jira')} className="bg-black text-white hover:bg-neutral-800">
                  Go to Jira Setup
                </Button>
              </div>
           )}
         </TabsContent>

                 {/* Teams Tab (Linear) */}
         <TabsContent value="teams" className="space-y-6">
           {getIntegrationByType('linear') ? (
             <LinearTeamManager 
               selectedTeams={selectedLinearTeams}
               onTeamSelect={setSelectedLinearTeams}
               selectionMode="multiple"
             />
           ) : (
                          <div className="flex flex-col items-center justify-center py-12 gap-3 w-full bg-white border border-neutral-200 rounded-xl px-6 py-6">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">📐</span>
                </div>
                <span className="text-lg font-medium text-neutral-900 mb-2">
                  Connect Linear First
                </span>
                <span className="text-neutral-700 mb-4 text-center">
                  You need to connect Linear to manage teams
                </span>
                <Button onClick={() => setActiveTab('linear')} className="bg-black text-white hover:bg-neutral-800">
                  Go to Linear Setup
                </Button>
              </div>
           )}
         </TabsContent>

                                   {/* Testing Tab */}
          <TabsContent value="testing" className="space-y-4">
            <div className="flex flex-col items-start gap-6 bg-white border border-neutral-200 rounded-xl px-6 py-6">
             <div className="flex w-full flex-col items-start gap-2">
               <span className="text-2xl font-bold text-neutral-900">
                 Connection Diagnostics
               </span>
               <span className="text-sm text-neutral-600">
                 Run comprehensive tests to verify your integrations are working correctly
               </span>
             </div>
             <div className="space-y-4 w-full">
               <div className="flex gap-4">
                 <Button 
                   onClick={() => runConnectionTest('github')}
                   disabled={testing || !getIntegrationByType('github')}
                   className="bg-black text-white hover:bg-neutral-800"
                 >
                   <TestTubeIcon className="w-4 h-4 mr-2" />
                   {testing ? 'Testing GitHub...' : 'Test GitHub Connection'}
                 </Button>
                 <Button 
                   onClick={() => runConnectionTest('jira')}
                   disabled={testing || !getIntegrationByType('jira')}
                   className="bg-black text-white hover:bg-neutral-800"
                 >
                   <TestTubeIcon className="w-4 h-4 mr-2" />
                   {testing ? 'Testing Jira...' : 'Test Jira Connection'}
                 </Button>
                 <Button 
                   onClick={() => runConnectionTest('linear')}
                   disabled={testing || !getIntegrationByType('linear')}
                   className="bg-black text-white hover:bg-neutral-800"
                 >
                   <TestTubeIcon className="w-4 h-4 mr-2" />
                   {testing ? 'Testing Linear...' : 'Test Linear Connection'}
                 </Button>
               </div>

               {connectionTest && (
                 <div className="space-y-4 pt-4 border-t border-neutral-200">
                   <div className="flex items-center justify-between">
                     <span className="font-medium text-neutral-900">Test Results</span>
                     <div className="flex items-center gap-2">
                       {connectionTest.success ? (
                         <CheckCircleIcon className="w-5 h-5 text-green-600" />
                       ) : (
                         <AlertTriangleIcon className="w-5 h-5 text-red-600" />
                       )}
                       <span className="text-sm text-neutral-700">
                         {connectionTest.timestamp && new Date(connectionTest.timestamp).toLocaleString()}
                       </span>
                     </div>
                   </div>

                   <div className="grid grid-cols-4 gap-4 mb-4">
                     <div className="text-center">
                       <div className="text-2xl font-bold text-blue-600">
                         {connectionTest.summary.total}
                       </div>
                       <div className="text-xs text-neutral-700">Total Tests</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-green-600">
                         {connectionTest.summary.passed}
                       </div>
                       <div className="text-xs text-neutral-700">Passed</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-yellow-600">
                         {connectionTest.summary.warnings}
                       </div>
                       <div className="text-xs text-neutral-700">Warnings</div>
                     </div>
                     <div className="text-center">
                       <div className="text-2xl font-bold text-red-600">
                         {connectionTest.summary.failed}
                       </div>
                       <div className="text-xs text-neutral-700">Failed</div>
                     </div>
                   </div>

                   <div className="space-y-3">
                     {connectionTest.tests.map((test, index) => (
                       <div key={index} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg bg-neutral-50">
                         <div className="flex items-center gap-3">
                           {test.status === 'passed' && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
                           {test.status === 'warning' && <AlertTriangleIcon className="w-4 h-4 text-yellow-600" />}
                           {test.status === 'failed' && <AlertTriangleIcon className="w-4 h-4 text-red-600" />}
                           {test.status === 'info' && <AlertTriangleIcon className="w-4 h-4 text-blue-600" />}
                           <div>
                             <p className="font-medium text-neutral-900">{test.name}</p>
                             <p className="text-sm text-neutral-700">{test.message}</p>
                             {test.error && (
                               <p className="text-xs text-red-600 mt-1">{test.error}</p>
                             )}
                           </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 </div>
               )}
             </div>
           </div>
         </TabsContent>
      </Tabs>
        </div>
      </div>
    </div>
  )
} 