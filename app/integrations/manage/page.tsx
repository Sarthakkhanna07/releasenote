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
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`Test failed: ${response.statusText}`)
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
        return <Badge className="bg-green-100 text-green-800">Connected</Badge>
      case 'expired':
        return <Badge className="bg-yellow-100 text-yellow-800">Token Expired</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800">Error</Badge>
      default:
        return <Badge className="bg-gray-100 text-gray-800">Not Connected</Badge>
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
    <div className="flex flex-col gap-8 pt-8 pb-12 px-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/integrations">
            <Button variant="outline" className="flex items-center gap-2">
              <ArrowLeftIcon className="w-4 h-4" />
              Back to Integrations
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-[#101828] mb-2">
              Integration Management
            </h1>
            <p className="text-[#667085]">
              Manage your connected services and repository access
            </p>
          </div>
        </div>
        <Link href="/integrations">
          <Button variant="outline">
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Integration
          </Button>
        </Link>
      </div>
      {/* Info box for advanced management context */}
      <div className="w-full max-w-3xl mt-2 mb-4">
        <div className="flex items-start gap-3 rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 text-blue-900">
          <AlertTriangleIcon className="w-5 h-5 mt-1 text-blue-400" />
          <div>
            <span className="font-semibold">Advanced Management:</span> This page is for detailed configuration, diagnostics, and repository/project management. For most users, the <Link href='/dashboard/integrations' className='underline text-blue-700 hover:text-blue-900'>main Integrations page</Link> is recommended for everyday use.
          </div>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800">
              <AlertTriangleIcon className="w-5 h-5" />
              <span>{error}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="github">GitHub</TabsTrigger>
          <TabsTrigger value="jira">Jira</TabsTrigger>
          <TabsTrigger value="linear">Linear</TabsTrigger>
          <TabsTrigger value="repositories">Repositories</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="teams">Teams</TabsTrigger>
          <TabsTrigger value="testing">Diagnostics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {integrationTypes.map((integrationType) => {
              const integration = getIntegrationByType(integrationType.type)
              const status = getIntegrationStatus(integration)
              
              return (
                <Card key={integrationType.type} className="border-[#e4e7ec]">
                  <CardHeader className="pb-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xl">{integrationType.icon}</span>
                        </div>
                        <div>
                          <CardTitle className="text-lg">{integrationType.name}</CardTitle>
                          <div className="flex items-center gap-2 mt-1">
                            {getStatusBadge(status)}
                            {integrationType.comingSoon && (
                              <Badge variant="outline" className="text-xs">Coming Soon</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="space-y-4">
                    <p className="text-sm text-[#667085]">
                      {integrationType.description}
                    </p>
                    
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Features:</p>
                      <div className="flex flex-wrap gap-1">
                        {integrationType.features.map((feature) => (
                          <Badge key={feature} variant="outline" className="text-xs">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      {integration ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-600">
                            Connected: {new Date(integration.created_at).toLocaleDateString()}
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => setActiveTab(integrationType.type)}
                            >
                              <SettingsIcon className="w-4 h-4 mr-2" />
                              Manage
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => runConnectionTest(integrationType.type)}
                              disabled={testing}
                            >
                              <TestTubeIcon className="w-4 h-4 mr-2" />
                              Test
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button 
                          onClick={() => window.location.href = integrationType.connectUrl}
                          className="w-full"
                          disabled={integrationType.comingSoon}
                        >
                          {integrationType.comingSoon ? 'Coming Soon' : `Connect ${integrationType.name}`}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <GitBranchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    GitHub Not Connected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Connect your GitHub account to access repositories and generate release notes
                  </p>
                  <Button onClick={() => window.location.href = '/api/auth/github'}>
                    Connect GitHub
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔷</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Jira Not Connected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Connect your Jira account to access projects and sync tickets
                  </p>
                  <Button onClick={() => window.location.href = '/api/auth/jira'}>
                    Connect Jira
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📐</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Linear Not Connected
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Connect your Linear account to access teams and sync issues
                  </p>
                  <Button onClick={() => window.location.href = '/api/auth/linear'}>
                    Connect Linear
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <GitBranchIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Connect GitHub First
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You need to connect GitHub to manage repositories
                  </p>
                  <Button onClick={() => setActiveTab('github')}>
                    Go to GitHub Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔷</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Connect Jira First
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You need to connect Jira to manage projects
                  </p>
                  <Button onClick={() => setActiveTab('jira')}>
                    Go to Jira Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
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
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="py-8">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">📐</span>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Connect Linear First
                  </h3>
                  <p className="text-gray-600 mb-4">
                    You need to connect Linear to manage teams
                  </p>
                  <Button onClick={() => setActiveTab('linear')}>
                    Go to Linear Setup
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Testing Tab */}
        <TabsContent value="testing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Connection Diagnostics</CardTitle>
              <CardDescription>
                Run comprehensive tests to verify your integrations are working correctly
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <Button 
                  onClick={() => runConnectionTest('github')}
                  disabled={testing || !getIntegrationByType('github')}
                >
                  <TestTubeIcon className="w-4 h-4 mr-2" />
                  {testing ? 'Testing GitHub...' : 'Test GitHub Connection'}
                </Button>
                <Button 
                  onClick={() => runConnectionTest('jira')}
                  disabled={testing || !getIntegrationByType('jira')}
                >
                  <TestTubeIcon className="w-4 h-4 mr-2" />
                  {testing ? 'Testing Jira...' : 'Test Jira Connection'}
                </Button>
                <Button 
                  onClick={() => runConnectionTest('linear')}
                  disabled={testing || !getIntegrationByType('linear')}
                >
                  <TestTubeIcon className="w-4 h-4 mr-2" />
                  {testing ? 'Testing Linear...' : 'Test Linear Connection'}
                </Button>
              </div>

              {connectionTest && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Test Results</h4>
                    <div className="flex items-center gap-2">
                      {connectionTest.success ? (
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangleIcon className="w-5 h-5 text-red-600" />
                      )}
                      <span className="text-sm text-gray-600">
                        {connectionTest.timestamp && new Date(connectionTest.timestamp).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {connectionTest.summary.total}
                      </div>
                      <div className="text-xs text-gray-600">Total Tests</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">
                        {connectionTest.summary.passed}
                      </div>
                      <div className="text-xs text-gray-600">Passed</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-600">
                        {connectionTest.summary.warnings}
                      </div>
                      <div className="text-xs text-gray-600">Warnings</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-600">
                        {connectionTest.summary.failed}
                      </div>
                      <div className="text-xs text-gray-600">Failed</div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {connectionTest.tests.map((test, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          {test.status === 'passed' && <CheckCircleIcon className="w-4 h-4 text-green-600" />}
                          {test.status === 'warning' && <AlertTriangleIcon className="w-4 h-4 text-yellow-600" />}
                          {test.status === 'failed' && <AlertTriangleIcon className="w-4 h-4 text-red-600" />}
                          {test.status === 'info' && <AlertTriangleIcon className="w-4 h-4 text-blue-600" />}
                          <div>
                            <p className="font-medium">{test.name}</p>
                            <p className="text-sm text-gray-600">{test.message}</p>
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
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}