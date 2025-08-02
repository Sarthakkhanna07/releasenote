"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from '@/lib/store/use-auth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DefaultPageLayout } from "@/subframe-ui/layouts/DefaultPageLayout";
import { TextField } from "@/subframe-ui/components/TextField";
import { FeatherGithub, FeatherTrello, FeatherLayout, FeatherMessageSquare, FeatherExternalLink, FeatherRefreshCw, FeatherSettings, FeatherLogOut, FeatherMoreVertical } from "@subframe/core";
import { IconWithBackground } from "@/subframe-ui/components/IconWithBackground";
import { Badge } from "@/subframe-ui/components/Badge";
import { DropdownMenu } from "@/subframe-ui/components/DropdownMenu";
import { IconButton } from "@/subframe-ui/components/IconButton";
import { Button } from "@/subframe-ui/components/Button";
import Link from "next/link";
import * as SubframeCore from "@subframe/core";

interface Integration {
  id: string;
  type: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  connected: boolean;
  lastSync?: string;
  connectUrl: string;
  repositories?: number;
  status?: 'active' | 'error' | 'pending';
}

const integrationIconMap: Record<string, React.ReactNode> = {
  github: <FeatherGithub className="w-6 h-6" />,
  jira: <FeatherTrello className="w-6 h-6" />,
  linear: <FeatherLayout className="w-6 h-6" />,
  slack: <FeatherMessageSquare className="w-6 h-6" />,
};

const badgeVariantMap: Record<string, 'success' | 'warning' | 'neutral' | 'brand'> = {
  active: 'success',
  error: 'warning',
  pending: 'neutral',
};

const badgeTextMap: Record<string, string> = {
  active: 'Connected',
  error: 'Error',
  pending: 'Not Connected',
};

export default function IntegrationsPage() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { user } = useAuthStore();
  const supabase = createClientComponentClient();

  useEffect(() => {
    if (user) {
      loadIntegrations();
    }
  }, [user]);

  const loadIntegrations = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', user.id);
      if (error) throw error;
      const integrationTypes = [
                 {
           type: 'github',
           name: 'GitHub',
           description: 'Import issues, pull requests, and commits for automated release notes',
           icon: <FeatherGithub className="w-6 h-6" />,
           connectUrl: '/api/auth/github',
         },
         {
           type: 'jira',
           name: 'Jira',
           description: 'Sync tickets and project management data for comprehensive release tracking',
           icon: <FeatherTrello className="w-6 h-6" />,
           connectUrl: '/api/auth/jira',
         },
         {
           type: 'linear',
           name: 'Linear',
           description: 'Import issues and development workflow for streamlined release management',
           icon: <FeatherLayout className="w-6 h-6" />,
           connectUrl: '/api/auth/linear',
         },
         {
           type: 'slack',
           name: 'Slack',
           description: 'Send release notifications and updates to your team channels',
           icon: <FeatherMessageSquare className="w-6 h-6" />,
           connectUrl: '/api/auth/slack',
         },
      ];
      const integrationsWithStatus = await Promise.all(
        integrationTypes.map(async (integration) => {
          const connectedIntegration = data?.find(d => d.type === integration.type);
          let repositories = 0;
          let status: 'active' | 'error' | 'pending' = 'pending';
          if (connectedIntegration && integration.type === 'github') {
            try {
              const repoResponse = await fetch('/api/integrations/github/repositories');
              if (repoResponse.ok) {
                const repoData = await repoResponse.json();
                repositories = repoData.repositories?.length || 0;
                status = 'active';
              } else {
                status = 'error';
              }
            } catch {
              status = 'error';
            }
          } else if (connectedIntegration) {
            status = 'active';
          }
          return {
            id: connectedIntegration?.id || integration.type,
            ...integration,
            connected: !!connectedIntegration,
            lastSync: connectedIntegration?.created_at || null,
            repositories,
            status,
          };
        })
      );
      setIntegrations(integrationsWithStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load integrations');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (integration: Integration) => {
    window.location.href = integration.connectUrl;
  };

  const handleTest = async (integration: Integration) => {
    if (!integration.connected) return;
    setTesting(integration.id);
    setError('');
    setSuccess('');
    try {
      let testEndpoint = '';
      switch (integration.type) {
        case 'github':
          testEndpoint = '/api/integrations/github/repositories';
          break;
        default:
          throw new Error(`Testing not implemented for ${integration.type}`);
      }
      const response = await fetch(testEndpoint);
      if (!response.ok) {
        throw new Error(`Test failed: ${response.statusText}`);
      }
      const data = await response.json();
      setSuccess(`${integration.name} test successful! Found ${data.repositories?.length || 0} repositories.`);
      setIntegrations(prev => prev.map(i =>
        i.id === integration.id
          ? { ...i, status: 'active', repositories: data.repositories?.length || 0 }
          : i
      ));
    } catch (err) {
      setError(`${integration.name} test failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      setIntegrations(prev => prev.map(i =>
        i.id === integration.id ? { ...i, status: 'error' } : i
      ));
    } finally {
      setTesting(null);
    }
  };

  const handleDisconnect = async (integration: Integration) => {
    if (!user || !integration.connected) return;
    try {
      const { error } = await supabase
        .from('integrations')
        .delete()
        .eq('id', integration.id)
        .eq('organization_id', user.id);
      if (error) throw error;
      setSuccess(`${integration.name} disconnected successfully`);
      await loadIntegrations();
    } catch (err) {
      setError(`Failed to disconnect ${integration.name}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };



  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full flex-col items-start">
        {/* Header */}
        <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-8 py-6">
          <div className="flex flex-col items-start gap-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center">
                <FeatherSettings className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-default-font">
                  Integrations
                </span>
                <span className="text-base text-subtext-color">
                  Connect your tools and services to enhance your release notes workflow
                </span>
              </div>
            </div>
          </div>
          <Link href="/dashboard/integrations/manage">
            <Button variant="neutral-secondary" className="flex items-center gap-2">
              <FeatherSettings className="w-4 h-4" />
              Advanced Management
            </Button>
          </Link>
        </div>

        <div className="flex w-full grow shrink-0 basis-0 flex-col items-start bg-default-background">

          {/* Error and Success Messages */}
          {error && (
            <div className="w-full px-8 py-4">
              <div className="max-w-4xl mx-auto">
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-xs font-bold">!</span>
                    </div>
                    {error}
                  </div>
                </div>
              </div>
            </div>
          )}
          {success && (
            <div className="w-full px-8 py-4">
              <div className="max-w-4xl mx-auto">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                    </div>
                    {success}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="w-full px-8 py-8">
            <div className="max-w-4xl mx-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                {loading ? (
                  <div className="flex items-center justify-center w-full min-h-[400px] col-span-2">
                    <div className="text-center">
                      <div className="flex items-center justify-center mx-auto mb-6">
                        <div className="relative">
                          <div className="w-8 h-8 border-2 border-neutral-200 border-t-brand-600 rounded-full animate-spin"></div>
                        </div>
                      </div>
                      <h3 className="text-lg font-semibold text-neutral-900 mb-2">Loading Integrations</h3>
                      <p className="text-neutral-600 max-w-sm mx-auto">We're fetching your connected services and checking their status...</p>
                    </div>
                  </div>
                ) : integrations.length === 0 ? (
                  <div className="text-center w-full col-span-2 py-12">
                    <div className="w-16 h-16 bg-neutral-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FeatherSettings className="w-8 h-8 text-neutral-400" />
                    </div>
                    <p className="text-neutral-500 font-medium">No integrations available</p>
                    <p className="text-sm text-neutral-400 mt-1">Connect your first integration to get started</p>
                  </div>
                ) : (
                  <>
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="flex flex-col items-start gap-6 bg-white border border-neutral-200 rounded-xl p-6 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-4">
                                                            <div className="w-12 h-12 bg-neutral-100 rounded-lg icon-perfect-center text-neutral-700">
                                <div>
                                  {integration.icon}
                                </div>
                              </div>
                            <div className="flex flex-col gap-1">
                              <span className="text-lg font-semibold text-neutral-900">
                                {integration.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {integration.type === 'slack' && !integration.connected ? (
                                  <Badge variant="brand">Configuration Required</Badge>
                                ) : (
                                    <Badge variant={integration.connected ? 'success' : integration.status === 'error' ? 'error' : 'neutral'}>
                                    {integration.connected ? 'Connected' : badgeTextMap[integration.status || 'pending']}
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          {integration.connected && (
                            <SubframeCore.DropdownMenu.Root>
                              <SubframeCore.DropdownMenu.Trigger asChild={true}>
                                <IconButton
                                  size="small"
                                  icon={<FeatherMoreVertical />}
                                  onClick={() => {}}
                                />
                              </SubframeCore.DropdownMenu.Trigger>
                              <SubframeCore.DropdownMenu.Portal>
                                <SubframeCore.DropdownMenu.Content
                                  side="bottom"
                                  align="end"
                                  sideOffset={4}
                                  asChild={true}
                                >
                                  <DropdownMenu>
                                    <DropdownMenu.DropdownItem icon={<FeatherRefreshCw />} onClick={() => handleTest(integration)}>
                                      {testing === integration.id ? 'Testing...' : 'Test Connection'}
                                    </DropdownMenu.DropdownItem>
                                    <DropdownMenu.DropdownItem icon={<FeatherSettings />}>
                                      Configure
                                    </DropdownMenu.DropdownItem>
                                    <DropdownMenu.DropdownDivider />
                                    <DropdownMenu.DropdownItem icon={<FeatherLogOut />} onClick={() => handleDisconnect(integration)}>
                                      Disconnect
                                    </DropdownMenu.DropdownItem>
                                  </DropdownMenu>
                                </SubframeCore.DropdownMenu.Content>
                              </SubframeCore.DropdownMenu.Portal>
                            </SubframeCore.DropdownMenu.Root>
                          )}
                        </div>

                        <p className="text-sm text-neutral-600 leading-relaxed">
                          {integration.description}
                        </p>

                        {integration.connected && (
                          <div className="w-full bg-neutral-50 rounded-lg p-4 space-y-3">
                            {integration.lastSync && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-neutral-600">
                                  Last synced
                                </span>
                                <span className="text-sm text-neutral-900">
                                  {new Date(integration.lastSync).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                            {integration.type === 'github' && integration.repositories !== undefined && (
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-neutral-600">
                                  Repositories
                                </span>
                                <span className="text-sm text-neutral-900">
                                  {integration.repositories}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        <div className="w-full flex gap-2">
                          {integration.connected ? (
                            integration.type === 'github' && (
                              <Link href="/dashboard/releases/new/ai" className="flex-1">
                                <Button variant="brand-primary" className="w-full">
                                  Generate Release Notes
                                </Button>
                              </Link>
                            )
                          ) : (
                            <Button
                              variant={integration.type === 'slack' ? 'neutral-secondary' : 'brand-primary'}
                              onClick={() => handleConnect(integration)}
                              className="w-full"
                            >
                              {integration.type === 'slack' ? 'Configure' : 'Connect'}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Help Section */}
          <div className="w-full px-8 py-8 border-t border-solid border-neutral-border">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col items-start gap-6 rounded-xl border border-neutral-200 bg-white p-8">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <FeatherExternalLink className="w-5 h-5 text-blue-600" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-neutral-900">
                      Need help?
                    </span>
                    <span className="text-sm text-neutral-600">
                      Check our documentation for detailed integration guides and troubleshooting tips
                    </span>
                  </div>
                </div>
                <Button
                  variant="neutral-secondary"
                  icon={<FeatherExternalLink />}
                  onClick={() => window.open('https://docs.releasenote.ai', '_blank')}
                >
                  View Documentation
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
} 