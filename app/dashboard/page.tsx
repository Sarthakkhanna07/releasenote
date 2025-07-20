"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/subframe-ui/components/Button";
import { FeatherBell, FeatherSettings, FeatherFileText, FeatherArrowRight, FeatherLink } from "@subframe/core";
import { IconButton } from "@/subframe-ui/components/IconButton";
import { IconWithBackground } from "@/subframe-ui/components/IconWithBackground";
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthStore } from "@/lib/store";

const INTEGRATION_TYPES = [
  {
    type: 'github',
    name: 'GitHub',
    description: 'Automate release notes with issues, PRs, and commits.',
    icon: <FeatherLink />, // Replace with a GitHub icon if available
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Sync tickets and project management data.',
    icon: <FeatherLink />, // Replace with a Jira icon if available
  },
  {
    type: 'linear',
    name: 'Linear',
    description: 'Import issues and development workflow.',
    icon: <FeatherLink />, // Replace with a Linear icon if available
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Send release notifications to your team.',
    icon: <FeatherLink />, // Replace with a Slack icon if available
  },
];

export default function DashboardHomePage() {
  const user = useAuthStore(state => state.user);
  const [integrations, setIntegrations] = useState<any[]>([]);
  const [loadingIntegrations, setLoadingIntegrations] = useState(false);
  const [testStatus, setTestStatus] = useState<{ [type: string]: 'idle' | 'loading' | 'success' | 'error' }>({});
  const [testError, setTestError] = useState<{ [type: string]: string }>({});

  useEffect(() => {
    if (!user?.id) return;
    setLoadingIntegrations(true);
    const fetchIntegrations = async () => {
      const supabase = createClientComponentClient();
      const { data } = await supabase
        .from('integrations')
        .select('*')
        .eq('organization_id', user.id);
      setIntegrations(data || []);
      setLoadingIntegrations(false);
    };
    fetchIntegrations();
  }, [user?.id]);

  const handleTestConnection = useCallback(async (type: string) => {
    setTestStatus(prev => ({ ...prev, [type]: 'loading' }));
    setTestError(prev => ({ ...prev, [type]: '' }));
    try {
      const res = await fetch(`/api/integrations/${type}/test-connection`, { method: 'POST' });
      if (!res.ok) throw new Error('Connection failed');
      setTestStatus(prev => ({ ...prev, [type]: 'success' }));
    } catch (err: any) {
      setTestStatus(prev => ({ ...prev, [type]: 'error' }));
      setTestError(prev => ({ ...prev, [type]: err.message || 'Test failed' }));
    } finally {
      setTimeout(() => setTestStatus(prev => ({ ...prev, [type]: 'idle' })), 2000);
    }
  }, []);

  // Map integrations by type for quick lookup
  const integrationsByType = integrations.reduce((acc, i) => {
    acc[i.type] = i;
    return acc;
  }, {} as Record<string, any>);

  return (
    <div className="px-8 py-0 w-full flex flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2 border-b border-solid border-neutral-border pb-2 mb-1">
        <span className="grow shrink-0 basis-0 text-2xl font-semibold text-default-font">
          Dashboard
        </span>
        <Link href="/dashboard/notifications">
          <Button
            variant="neutral-tertiary"
            icon={<FeatherBell />}
            className="text-sm px-3 py-1"
          >
            Notifications
          </Button>
        </Link>
        <Link href="/dashboard/settings">
          <IconButton
            icon={<FeatherSettings />}
            className="w-8 h-8"
          />
        </Link>
      </div>
      <div className="flex flex-col items-start gap-1 mb-2">
        <span className="text-2xl font-bold text-default-font">
          Welcome to Release Notes Generator
        </span>
        <span className="text-base text-subtext-color">
          Ready to generate some awesome release notes?
        </span>
      </div>
      <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
        <span className="text-lg font-semibold text-default-font mb-2">
          Quick Actions
        </span>
        <div className="flex w-full flex-wrap items-start gap-14">
          <Link href="/dashboard/releases/start">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Create Release Notes
            </Button>
          </Link>
          <Link href="/dashboard/integrations">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Integrations
            </Button>
          </Link>
          <Link href="/dashboard/ai-context">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              AI Context Settings
            </Button>
          </Link>
          <Link href="/dashboard/templates">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Template Management
            </Button>
          </Link>
          <a href="mailto:help@releasenote.ai">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Support &amp; Help
            </Button>
          </a>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-lg font-semibold text-default-font mb-1">
          Recent Release Notes
        </span>
        <div className="flex w-full flex-col items-center gap-3 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-10">
          <IconWithBackground size="large" icon={<FeatherFileText />} />
          <span className="text-base text-subtext-color">
            No release notes created yet.
          </span>
          <Link href="/dashboard/releases/start">
            <Button className="text-sm px-4 py-2">
              Create your first one
            </Button>
          </Link>
        </div>
        <Link href="/dashboard/releases">
          <Button
            variant="neutral-tertiary"
            iconRight={<FeatherArrowRight />}
            className="text-sm px-3 py-1 self-end"
          >
            View all release notes
          </Button>
        </Link>
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-lg font-semibold text-default-font mb-1">
          Integrations Status
        </span>
        <div className="flex w-full flex-col gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-8">
          {loadingIntegrations ? (
            <span className="text-base text-subtext-color">Loading integrations...</span>
          ) : (
            <>
              {INTEGRATION_TYPES.map((meta) => {
                const integration = integrationsByType[meta.type];
                const isConnected = !!integration;
                return (
                  <div key={meta.type} className="flex flex-col md:flex-row md:items-center justify-between w-full py-3 border-b last:border-b-0 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100">{meta.icon}</span>
                      <div>
                        <span className="font-medium text-default-font">{meta.name}</span>
                        <span className="block text-xs text-subtext-color">{meta.description}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2 md:mt-0">
                      <span className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{isConnected ? 'Connected' : 'Not Connected'}</span>
                      {isConnected && integration.created_at && (
                        <span className="text-xs text-neutral-400">Last sync: {new Date(integration.created_at).toLocaleDateString()}</span>
                      )}
                      {meta.type === 'github' && isConnected && false && (
                        <Button
                          size="small"
                          variant="neutral-secondary"
                          className="ml-2"
                          disabled={testStatus.github === 'loading'}
                          onClick={() => handleTestConnection('github')}
                          aria-label="Test GitHub Connection"
                        >
                          {testStatus.github === 'loading' ? 'Testing...' : testStatus.github === 'success' ? 'Success' : testStatus.github === 'error' ? 'Error' : 'Test Connection'}
                        </Button>
                      )}
                      {meta.type === 'github' && testStatus.github === 'error' && (
                        <span className="text-xs text-red-600 ml-2">{testError.github}</span>
                      )}
                      <Link href="/dashboard/integrations">
                        <Button size="small" variant="neutral-tertiary" className="ml-2">Manage</Button>
                      </Link>
                    </div>
                  </div>
                );
              })}
              {INTEGRATION_TYPES.every(meta => !integrationsByType[meta.type]) && (
                <div className="flex flex-col items-center gap-2 py-8">
                  <IconWithBackground size="large" icon={<FeatherLink />} />
                  <span className="text-base text-subtext-color">No integrations connected yet.</span>
                  <Link href="/dashboard/integrations">
                    <Button className="text-sm px-4 py-2">Connect your first integration</Button>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-3 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
        <span className="text-lg font-semibold text-default-font mb-1">
          Getting Started Checklist
        </span>
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border py-3">
            <span className="text-base text-default-font">
              Connect an integration (Jira, GitHub, etc.)
            </span>
            <Link href="/dashboard/integrations">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Setup
              </Button>
            </Link>
          </div>
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border py-3">
            <span className="text-base text-default-font">
              Configure your AI Context
            </span>
            <Link href="/dashboard/ai-context">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Configure
              </Button>
            </Link>
          </div>
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border py-3">
            <span className="text-base text-default-font">
              Create your first Release Note
            </span>
            <Link href="/dashboard/releases/start">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Create
              </Button>
            </Link>
          </div>
          <div className="flex w-full items-center justify-between py-3">
            <span className="text-base text-default-font">
              Explore and manage Templates
            </span>
            <Link href="/dashboard/templates">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Templates
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}