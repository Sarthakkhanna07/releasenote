'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  CheckCircleIcon, 
  XCircleIcon, 
  AlertTriangleIcon,
  RefreshCwIcon,
  WifiIcon,
  ShieldCheckIcon,
  ClockIcon,
  ExternalLinkIcon,
  InfoIcon
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntegrationHealth {
  status: 'healthy' | 'warning' | 'error' | 'unknown'
  lastChecked: string
  responseTime?: number
  uptime?: number
  details: {
    connection: boolean
    authentication: boolean
    permissions: boolean
    rateLimit?: {
      remaining: number
      limit: number
      resetAt: string
    }
  }
  metrics?: {
    totalRequests: number
    successRate: number
    avgResponseTime: number
  }
  issues?: Array<{
    type: 'error' | 'warning' | 'info'
    message: string
    solution?: string
    docs?: string
  }>
}

interface IntegrationStatusProps {
  integrationType: 'github' | 'jira' | 'linear' | 'slack'
  integrationId?: string
  autoRefresh?: boolean
  refreshInterval?: number
  className?: string
}

export function IntegrationStatus({ 
  integrationType, 
  integrationId,
  autoRefresh = true,
  refreshInterval = 30000, // 30 seconds
  className 
}: IntegrationStatusProps) {
  const [health, setHealth] = useState<IntegrationHealth | null>(null)
  const [loading, setLoading] = useState(true)
  const [testing, setTesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkHealth = async () => {
    if (!integrationId) return

    try {
      setError(null)
      const response = await fetch(`/api/integrations/${integrationType}/health`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ integrationId })
      })

      if (!response.ok) {
        throw new Error(`Health check failed: ${response.statusText}`)
      }

      const healthData = await response.json()
      setHealth(healthData)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Health check failed')
      setHealth(null)
    }
  }

  const runDiagnostics = async () => {
    setTesting(true)
    try {
      await checkHealth()
      
      // Run additional tests based on integration type
      if (integrationType === 'github') {
        await fetch('/api/integrations/github/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ integrationId })
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Diagnostics failed')
    } finally {
      setTesting(false)
    }
  }

  useEffect(() => {
    if (integrationId) {
      checkHealth().finally(() => setLoading(false))
    }
  }, [integrationId, integrationType])

  useEffect(() => {
    if (autoRefresh && integrationId && refreshInterval > 0) {
      const interval = setInterval(checkHealth, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, integrationId, refreshInterval])

  const getStatusColor = (status: IntegrationHealth['status']) => {
    switch (status) {
      case 'healthy': return 'text-green-600'
      case 'warning': return 'text-yellow-600'
      case 'error': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusIcon = (status: IntegrationHealth['status']) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="w-5 h-5 text-green-600" />
      case 'warning': return <AlertTriangleIcon className="w-5 h-5 text-yellow-600" />
      case 'error': return <XCircleIcon className="w-5 h-5 text-red-600" />
      default: return <InfoIcon className="w-5 h-5 text-gray-600" />
    }
  }

  const getStatusBadge = (status: IntegrationHealth['status']) => {
    const baseClasses = "text-xs font-medium"
    switch (status) {
      case 'healthy': return <Badge className={cn(baseClasses, "bg-green-100 text-green-800")}>Healthy</Badge>
      case 'warning': return <Badge className={cn(baseClasses, "bg-yellow-100 text-yellow-800")}>Warning</Badge>
      case 'error': return <Badge className={cn(baseClasses, "bg-red-100 text-red-800")}>Error</Badge>
      default: return <Badge className={cn(baseClasses, "bg-gray-100 text-gray-800")}>Unknown</Badge>
    }
  }

  const formatUptime = (uptime?: number) => {
    if (!uptime) return 'Unknown'
    if (uptime >= 99.9) return '99.9%+'
    return `${uptime.toFixed(1)}%`
  }

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const minutes = Math.floor(diff / 60000)
    
    if (minutes < 1) return 'Just now'
    if (minutes === 1) return '1 minute ago'
    if (minutes < 60) return `${minutes} minutes ago`
    
    const hours = Math.floor(minutes / 60)
    if (hours === 1) return '1 hour ago'
    if (hours < 24) return `${hours} hours ago`
    
    return date.toLocaleDateString()
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <RefreshCwIcon className="w-5 h-5 animate-spin text-neutral-500" />
            <span className="text-neutral-700">Checking integration status...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error && !health) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <XCircleIcon className="w-5 h-5 text-red-600" />
              <div>
                <p className="font-medium text-red-600">Connection Error</p>
                <p className="text-sm text-neutral-700">{error}</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={runDiagnostics} disabled={testing}>
              <RefreshCwIcon className={cn("w-4 h-4", testing && "animate-spin")} />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!health) {
    return (
      <Card className={className}>
        <CardContent className="pt-6">
          <div className="text-center py-4">
            <p className="text-neutral-700">No integration data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {getStatusIcon(health.status)}
            <div>
              <CardTitle className="text-lg capitalize text-neutral-900">
                {integrationType} Integration Status
              </CardTitle>
              <CardDescription className="text-neutral-700">
                Last checked: {formatLastChecked(health.lastChecked)}
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(health.status)}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={runDiagnostics}
              disabled={testing}
            >
              <RefreshCwIcon className={cn("w-4 h-4 mr-2", testing && "animate-spin")} />
              {testing ? 'Testing...' : 'Test'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Connection Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center gap-3">
            <WifiIcon className={cn("w-4 h-4", health.details.connection ? "text-green-600" : "text-red-600")} />
            <div>
              <p className="text-sm font-medium text-neutral-800">Connection</p>
              <p className="text-xs text-neutral-700">
                {health.details.connection ? 'Connected' : 'Disconnected'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ShieldCheckIcon className={cn("w-4 h-4", health.details.authentication ? "text-green-600" : "text-red-600")} />
            <div>
              <p className="text-sm font-medium text-neutral-800">Authentication</p>
              <p className="text-xs text-neutral-700">
                {health.details.authentication ? 'Valid' : 'Invalid'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <CheckCircleIcon className={cn("w-4 h-4", health.details.permissions ? "text-green-600" : "text-red-600")} />
            <div>
              <p className="text-sm font-medium text-neutral-800">Permissions</p>
              <p className="text-xs text-neutral-700">
                {health.details.permissions ? 'Sufficient' : 'Insufficient'}
              </p>
            </div>
          </div>
        </div>

        {/* Rate Limit (if applicable) */}
        {health.details.rateLimit && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-neutral-800">API Rate Limit</p>
              <p className="text-xs text-neutral-700">
                {health.details.rateLimit.remaining} / {health.details.rateLimit.limit} remaining
              </p>
            </div>
            <Progress 
              value={(health.details.rateLimit.remaining / health.details.rateLimit.limit) * 100}
              className="h-2"
            />
            <p className="text-xs text-neutral-700">
              Resets: {new Date(health.details.rateLimit.resetAt).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Performance Metrics */}
        {health.metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
            <div>
              <p className="text-sm font-medium text-neutral-800">Success Rate</p>
              <div className="flex items-center gap-2">
                <p className="text-lg font-bold text-green-600">
                  {health.metrics.successRate.toFixed(1)}%
                </p>
                <Progress value={health.metrics.successRate} className="flex-1 h-2" />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-neutral-800">Avg Response Time</p>
              <p className="text-lg font-bold text-blue-600">
                {health.metrics.avgResponseTime}ms
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-neutral-800">Total Requests</p>
              <p className="text-lg font-bold text-neutral-900">
                {health.metrics.totalRequests.toLocaleString()}
              </p>
            </div>
          </div>
        )}

        {/* Issues and Recommendations */}
        {health.issues && health.issues.length > 0 && (
          <div className="space-y-3 pt-4 border-t">
            <h4 className="font-medium text-neutral-900">Issues & Recommendations</h4>
            {health.issues.map((issue, index) => (
              <div 
                key={index}
                className={cn(
                  "p-3 rounded-lg border-l-4",
                  issue.type === 'error' && "bg-red-50 border-red-400",
                  issue.type === 'warning' && "bg-yellow-50 border-yellow-400",
                  issue.type === 'info' && "bg-blue-50 border-blue-400"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "w-4 h-4 mt-0.5",
                    issue.type === 'error' && "text-red-600",
                    issue.type === 'warning' && "text-yellow-600",
                    issue.type === 'info' && "text-blue-600"
                  )}>
                    {issue.type === 'error' && <XCircleIcon className="w-4 h-4" />}
                    {issue.type === 'warning' && <AlertTriangleIcon className="w-4 h-4" />}
                    {issue.type === 'info' && <InfoIcon className="w-4 h-4" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-neutral-900">{issue.message}</p>
                    {issue.solution && (
                      <p className="text-sm text-neutral-700 mt-1">{issue.solution}</p>
                    )}
                    {issue.docs && (
                      <a 
                        href={issue.docs}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mt-2"
                      >
                        View Documentation
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" size="sm" asChild>
            <a href={`/integrations/${integrationType}/settings`}>
              <RefreshCwIcon className="w-4 h-4 mr-2" />
              Reconnect
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={`/integrations/${integrationType}/logs`}>
              <ClockIcon className="w-4 h-4 mr-2" />
              View Logs
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}