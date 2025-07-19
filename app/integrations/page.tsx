'use client'

import { useState, useEffect } from 'react'
import { useAuthStore } from '@/lib/store/use-auth'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  GithubIcon,
  TestTubeIcon,
  RefreshCwIcon,
  ExternalLinkIcon,
  CheckCircleIcon,
  XCircleIcon,
  AlertCircleIcon
} from 'lucide-react'
import Link from 'next/link'

interface Integration {
  id: string
  type: string
  name: string
  description: string
  icon: string
  connected: boolean
  lastSync?: string
  connectUrl: string
  repositories?: number
  status?: 'active' | 'error' | 'pending'
}

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { user } = useAuthStore()
  const supabase = createClientComponentClient()

  useEffect(() => {
    if (user) {
      loadIntegrations()
    }
  }, [user])

  const loadIntegrations = async () => {
    if (!user) return

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', user.id)

      if (error) throw error

      const integrationTypes = [
        {
          type: 'github',
          name: 'GitHub',
          description: 'Import issues, pull requests, and commits for automated release notes',
          icon: '🐙',
          connectUrl: '/api/auth/github'
        },
        {
          type: 'jira',
          name: 'Jira',
          description: 'Sync tickets and project management data for comprehensive release tracking',
          icon: '🔷',
          connectUrl: '/api/auth/jira'
        },
        {
          type: 'linear',
          name: 'Linear',
          description: 'Import issues and development workflow for streamlined release management',
          icon: '📐',
          connectUrl: '/api/auth/linear'
        },
        {
          type: 'slack',
          name: 'Slack',
          description: 'Send release notifications and updates to your team channels',
          icon: '💬',
          connectUrl: '/api/auth/slack'
        }
      ]

      const integrationsWithStatus = await Promise.all(
        integrationTypes.map(async (integration) => {
          const connectedIntegration = data?.find(d => d.type === integration.type)
          let repositories = 0
          let status: 'active' | 'error' | 'pending' = 'pending'

          if (connectedIntegration && integration.type === 'github') {
            try {
              const repoResponse = await fetch('/api/integrations/github/repositories')
              if (repoResponse.ok) {
                const repoData = await repoResponse.json()
                repositories = repoData.repositories?.length || 0
                status = 'active'
              } else {
                status = 'error'
              }
            } catch {
              status = 'error'
            }
          } else if (connectedIntegration) {
            status = 'active'
          }

          return {
            id: connectedIntegration?.id || integration.type,
            ...integration,
            connected: !!connectedIntegration,
            lastSync: connectedIntegration?.created_at || null,
            repositories,
            status
          }
        })
      )

      setIntegrations(integrationsWithStatus)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations')
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = (integration: Integration) => {
    window.location.href = integration.connectUrl
  }

  const handleTest = async (integration: Integration) => {
    if (!integration.connected) return

    setTesting(integration.id)
    setError('')
    setSuccess('')

    try {
      let testEndpoint = ''

      switch (integration.type) {
        case 'github':
          testEndpoint = '/api/integrations/github/repositories'
          break
        default:
          throw new Error(`Testing not implemented for ${integration.type}`)
      }

      const response = await fetch(testEndpoint)
      if (!response.ok) {
        throw new Error(`Test failed: ${response.statusText}`)
      }

      const data = await response.json()
      setSuccess(`${integration.name} test successful! Found ${data.repositories?.length || 0} repositories.`)

      // Update integration status
      setIntegrations(prev => prev.map(i =>
        i.id === integration.id
          ? { ...i, status: 'active', repositories: data.repositories?.length || 0 }
          : i
      ))

    } catch (err) {
      setError(`${integration.name} test failed: ${err instanceof Error ? err.message : 'Unknown error'}`)

      // Update integration status to error
      setIntegrations(prev => prev.map(i =>
        i.id === integration.id ? { ...i, status: 'error' } : i
      ))
    } finally {
      setTesting(null)
    }
  }

  const handleDisconnect = async (integration: Integration) => {
    if (!user || !integration.connected) return

    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id)
        .eq('organization_id', user.id)

      if (error) throw error

      setSuccess(`${integration.name} disconnected successfully`)
      await loadIntegrations()

    } catch (err) {
      setError(`Failed to disconnect ${integration.name}: ${err instanceof Error ? err.message : 'Unknown error'}`)
    }
  }

  const getStatusIcon = (integration: Integration) => {
    if (!integration.connected) return null

    switch (integration.status) {
      case 'active':
        return <CheckCircleIcon className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircleIcon className="h-4 w-4 text-red-600" />
      default:
        return <AlertCircleIcon className="h-4 w-4 text-yellow-600" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCwIcon className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading integrations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pt-8 pb-12 px-8 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-[#101828] mb-2">
          Integrations
        </h1>
        <p className="text-[#667085]">
          Connect your favorite tools to automate release note generation and streamline your workflow
        </p>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {success}
        </div>
      )}

      {/* Connected Integrations */}
      <div className="space-y-6">
        <h2 className="text-xl font-semibold text-[#101828]">
          Available Integrations
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {integrations.map((integration) => (
            <Card key={integration.id} className="border-[#e4e7ec] hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      <span className="text-xl">{integration.icon}</span>
                    </div>
                    <div>
                      <CardTitle className="text-lg">{integration.name}</CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={integration.connected ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                          {integration.connected ? 'Connected' : 'Not Connected'}
                        </Badge>
                        {getStatusIcon(integration)}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <p className="text-sm text-[#667085]">
                  {integration.description}
                </p>

                {integration.connected && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="space-y-1 text-sm">
                      {integration.lastSync && (
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Connected:</span>
                          <span className="text-[#101828]">
                            {new Date(integration.lastSync).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {integration.type === 'github' && integration.repositories !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-[#667085]">Repositories:</span>
                          <span className="text-[#101828]">{integration.repositories}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-2">
                  {integration.connected ? (
                    <>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          disabled={testing === integration.id}
                          onClick={() => handleTest(integration)}
                        >
                          <TestTubeIcon className="h-4 w-4 mr-2" />
                          {testing === integration.id ? 'Testing...' : 'Test Connection'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnect(integration)}
                        >
                          Disconnect
                        </Button>
                      </div>

                      {integration.type === 'github' && (
                        <Link href="/releases/new/ai" className="w-full">
                          <Button className="w-full bg-[#7F56D9] text-white hover:bg-[#6941C6]">
                            <ExternalLinkIcon className="h-4 w-4 mr-2" />
                            Generate Release Notes
                          </Button>
                        </Link>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => handleConnect(integration)}
                      className="w-full bg-[#7F56D9] text-white hover:bg-[#6941C6]"
                    >
                      Connect {integration.name}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Help Section */}
      <Card className="border-[#e4e7ec]">
        <CardHeader>
          <CardTitle>Need Help?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-[#667085]">
              Having trouble connecting your integrations? Here are some common solutions:
            </p>
            <ul className="space-y-2 text-sm text-[#667085]">
              <li>• Make sure you have the necessary permissions in your external service</li>
              <li>• Check that your organization settings are properly configured</li>
              <li>• For GitHub, ensure you have access to the repositories you want to use</li>
              <li>• Try disconnecting and reconnecting if you're experiencing issues</li>
            </ul>
            <div className="pt-2">
              <Link href="/settings" className="text-[#7F56D9] hover:text-[#6941C6] text-sm">
                View Settings →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}