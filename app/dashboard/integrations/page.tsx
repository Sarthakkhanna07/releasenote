"use client";

import React, { useState, useEffect } from "react";
import { useAuthStore } from '@/lib/store/use-auth';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { DefaultPageLayout } from "@/subframe-ui/layouts/DefaultPageLayout";
import { TextField } from "@/subframe-ui/components/TextField";
import { FeatherSearch, FeatherGithub, FeatherTrello, FeatherLayout, FeatherMessageSquare, FeatherExternalLink, FeatherRefreshCw, FeatherSettings, FeatherLogOut, FeatherMoreVertical } from "@subframe/core";
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
  github: <FeatherGithub />,
  jira: <FeatherTrello />,
  linear: <FeatherLayout />,
  slack: <FeatherMessageSquare />,
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
  const [search, setSearch] = useState("");

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
          icon: <FeatherGithub />,
          connectUrl: '/api/auth/github',
        },
        {
          type: 'jira',
          name: 'Jira',
          description: 'Sync tickets and project management data for comprehensive release tracking',
          icon: <FeatherTrello />,
          connectUrl: '/api/auth/jira',
        },
        {
          type: 'linear',
          name: 'Linear',
          description: 'Import issues and development workflow for streamlined release management',
          icon: <FeatherLayout />,
          connectUrl: '/api/auth/linear',
        },
        {
          type: 'slack',
          name: 'Slack',
          description: 'Send release notifications and updates to your team channels',
          icon: <FeatherMessageSquare />,
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

  // Filter integrations by search
  const filteredIntegrations = integrations.filter(integration =>
    integration.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex-1 w-full min-h-screen flex flex-col bg-neutral-50">
      <div className="flex flex-col items-start gap-12 w-full py-12">
        <div className="flex w-full flex-row items-center justify-between gap-8 px-10 mb-4">
          <div className="flex flex-col items-start gap-2">
            <span className="text-heading-1 font-heading-1 text-default-font">
              Integrations
            </span>
            <span className="text-body font-body text-subtext-color">
              Connect your tools and services to enhance your release notes workflow
            </span>
          </div>
          <Link href="/integrations/manage" legacyBehavior>
            <a title="Advanced Management: Configure repositories, projects, and run diagnostics" aria-label="Advanced Management" className="ml-auto">
              <Button variant="outline" className="flex items-center gap-2">
                <FeatherSettings className="w-5 h-5" />
                <span className="hidden sm:inline">Advanced Management</span>
              </Button>
            </a>
          </Link>
        </div>
        <TextField
          className="h-auto w-full flex-none"
          variant="filled"
          label=""
          helpText=""
          icon={<FeatherSearch />}
        >
          <TextField.Input
            placeholder="Search integrations..."
            value={search}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
          />
        </TextField>
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 w-full">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 w-full">
            {success}
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {loading ? (
            <div className="flex items-center justify-center w-full min-h-[200px] col-span-2">
              <FeatherRefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <span className="ml-2">Loading integrations...</span>
            </div>
          ) : filteredIntegrations.length === 0 ? (
            <div className="text-center w-full text-neutral-400 col-span-2">No integrations found.</div>
          ) : (
            <>
              {filteredIntegrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex flex-col items-start gap-4 bg-white border border-neutral-200 rounded-xl px-8 py-8 min-w-[320px] max-w-sm w-full"
                >
                  <div className="flex w-full items-center gap-4 mb-2">
                    <IconWithBackground size="large" icon={integration.icon} />
                    <div className="flex grow shrink-0 basis-0 flex-col items-start gap-1">
                      <span className="text-base font-semibold text-neutral-900">
                        {integration.name}
                      </span>
                      {integration.type === 'slack' && !integration.connected ? (
                        <span className="bg-blue-100 text-blue-700 rounded-full px-3 py-1 text-xs font-medium">Configuration Required</span>
                      ) : (
                        <span className={`rounded-full px-3 py-1 text-xs font-medium ${integration.connected ? 'bg-green-100 text-green-700' : integration.status === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>{integration.connected ? 'Connected' : badgeTextMap[integration.status || 'pending']}</span>
                      )}
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
                  <span className="text-sm text-neutral-500 mb-2">
                    {integration.description}
                  </span>
                  {integration.connected && (
                    <div className="flex w-full flex-col items-start gap-2 rounded-md bg-neutral-50 px-4 py-3 mb-2">
                      {integration.lastSync && (
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs text-neutral-400 font-medium">
                            Last synced
                          </span>
                          <span className="text-xs text-neutral-900 font-medium">
                            {new Date(integration.lastSync).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {integration.type === 'github' && integration.repositories !== undefined && (
                        <div className="flex w-full items-center justify-between">
                          <span className="text-xs text-neutral-400 font-medium">
                            Repositories
                          </span>
                          <span className="text-xs text-neutral-900 font-medium">
                            {integration.repositories}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                  {integration.connected ? (
                    integration.type === 'github' && (
                      <Link href="/releases/new/ai" className="w-full">
                        <Button className="h-10 w-full flex-none rounded-lg bg-neutral-100 text-neutral-800 font-medium border-none shadow-none" variant="brand-secondary">
                          Generate Release Notes
                        </Button>
                      </Link>
                    )
                  ) : (
                    <Button
                      className={`h-10 w-full flex-none rounded-lg font-medium ${integration.type === 'slack' ? 'bg-neutral-100 text-neutral-800' : 'bg-black text-white'}`}
                      variant={integration.type === 'slack' ? 'brand-secondary' : undefined}
                      onClick={() => handleConnect(integration)}
                    >
                      {integration.type === 'slack' ? 'Configure' : 'Connect'}
                    </Button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
        <div className="flex w-full max-w-[1024px] flex-col items-start gap-6 rounded-xl border border-neutral-200 bg-white px-8 py-8 mt-8">
          <div className="flex w-full flex-col items-start gap-2">
            <span className="text-2xl font-bold text-neutral-900">
              Need help?
            </span>
            <span className="text-sm text-neutral-500">
              Check our documentation for detailed integration guides and troubleshooting tips
            </span>
          </div>
          <Button
            variant="neutral-secondary"
            icon={<FeatherExternalLink />}
            onClick={() => window.open('https://docs.releasenote.ai', '_blank')}
            className="h-10 rounded-lg font-medium bg-neutral-100 text-neutral-800"
          >
            View Documentation
          </Button>
        </div>
      </div>
    </div>
  );
} 