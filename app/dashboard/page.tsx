"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/subframe-ui/components/Button";
import { FeatherBell, FeatherSettings, FeatherLink, FeatherPlus, FeatherZap, FeatherGithub, FeatherTrello, FeatherLayout, FeatherMessageSquare } from "@subframe/core";
import { IconButton } from "@/subframe-ui/components/IconButton";
import { IconWithBackground } from "@/subframe-ui/components/IconWithBackground";
import Link from "next/link";
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useAuthStore } from "@/lib/store";
import { getBrowserCache, setBrowserCache } from "@/lib/browser-cache";

const INTEGRATION_TYPES = [
  {
    type: 'github',
    name: 'GitHub',
    description: 'Automate release notes with issues, PRs, and commits.',
    icon: <FeatherGithub className="w-5 h-5 text-neutral-700" />,
  },
  {
    type: 'jira',
    name: 'Jira',
    description: 'Sync tickets and project management data.',
    icon: <FeatherTrello className="w-5 h-5 text-neutral-700" />,
  },
  {
    type: 'linear',
    name: 'Linear',
    description: 'Import issues and development workflow.',
    icon: <FeatherLayout className="w-5 h-5 text-neutral-700" />,
  },
  {
    type: 'slack',
    name: 'Slack',
    description: 'Send release notifications to your team.',
    icon: <FeatherMessageSquare className="w-5 h-5 text-neutral-700" />,
  },
];

// Simple cache keys
const CACHE_KEYS = {
  AI_CONTEXT: (orgId: string) => `dashboard:ai_context:${orgId}`,
  RELEASE_NOTES: (orgId: string) => `dashboard:release_notes:${orgId}`,
  INTEGRATIONS: (orgId: string) => `dashboard:integrations:${orgId}`,
  RECENT_NOTE: (orgId: string) => `dashboard:recent_note:${orgId}`,
};

// Cache TTL in seconds
const CACHE_TTL = {
  AI_CONTEXT: 300, // 5 minutes
  RELEASE_NOTES: 180, // 3 minutes
  INTEGRATIONS: 300, // 5 minutes
  RECENT_NOTE: 120, // 2 minutes
};

export default function DashboardHomePage() {
  const user = useAuthStore(state => state.user);
  const organization = useAuthStore(state => state.organization);
  
  // Single loading state - show nothing until everything is ready
  const [isReady, setIsReady] = useState(false);
  
  // Dashboard data
  const [dashboardData, setDashboardData] = useState<{
    hasAIContext: boolean;
    hasReleaseNote: boolean;
    hasPublishedNote: boolean;
    integrations: Array<{ type: string; created_at?: string }>;
    recentNote: { title: string; created_at: string; status: string; id: string } | null;
  }>({
    hasAIContext: false,
    hasReleaseNote: false,
    hasPublishedNote: false,
    integrations: [],
    recentNote: null,
  });

  const didYouKnowTips = React.useMemo(() => [
    'You can use AI to summarize your Jira tickets and generate professional release notes in seconds.',
    'Integrations let you automate release notes from GitHub, Jira, and more.',
    'You can customize your AI context for more tailored release notes.',
    'Publishing release notes keeps your users informed and engaged.',
    'You can manage your integrations anytime from the Integrations page.'
  ], []);
  const [tip, setTip] = useState(didYouKnowTips[0]);

  // Load all data in background, then show UI
  useEffect(() => {
    if (!user?.id || !organization?.id) return;

    const loadDashboardData = async () => {
      const orgId = organization.id;
      const supabase = createClientComponentClient();

      try {
        // Load all data in parallel with caching
        const [
          aiContextResult,
          releaseNotesResult,
          integrationsResult,
          recentNoteResult
        ] = await Promise.allSettled([
          // AI Context
          (async () => {
            const cacheKey = CACHE_KEYS.AI_CONTEXT(orgId);
            const cached = await getBrowserCache(cacheKey);
            if (cached) return cached;
            
            const response = await fetch('/api/ai-context');
            const data = await response.json();
            await setBrowserCache(cacheKey, data, CACHE_TTL.AI_CONTEXT);
            return data;
          })(),

          // Release Notes
          (async () => {
            const cacheKey = CACHE_KEYS.RELEASE_NOTES(orgId);
            const cached = await getBrowserCache(cacheKey);
            if (cached) return cached;
            
            const { data, error } = await supabase
              .from('release_notes')
              .select('id,status')
              .eq('organization_id', orgId);
            
            if (error) throw error;
            const result = { data: data || [] };
            await setBrowserCache(cacheKey, result, CACHE_TTL.RELEASE_NOTES);
            return result;
          })(),

          // Integrations
          (async () => {
            const cacheKey = CACHE_KEYS.INTEGRATIONS(orgId);
            const cached = await getBrowserCache(cacheKey);
            if (cached) return cached;
            
            const { data, error } = await supabase
              .from('integrations')
              .select('*')
              .eq('organization_id', orgId);
            
            if (error) throw error;
            const result = { data: data || [] };
            await setBrowserCache(cacheKey, result, CACHE_TTL.INTEGRATIONS);
            return result;
          })(),

          // Recent Note
          (async () => {
            const cacheKey = CACHE_KEYS.RECENT_NOTE(orgId);
            const cached = await getBrowserCache(cacheKey);
            if (cached) return cached;
            
            const { data, error } = await supabase
              .from('release_notes')
              .select('id,title,created_at,status')
              .eq('organization_id', orgId)
              .order('created_at', { ascending: false })
              .limit(1);
            
            if (error) throw error;
            const result = { data: data && data.length > 0 ? data[0] : null };
            await setBrowserCache(cacheKey, result, CACHE_TTL.RECENT_NOTE);
            return result;
          })(),
        ]);

        // Process results
        const newData: {
          hasAIContext: boolean;
          hasReleaseNote: boolean;
          hasPublishedNote: boolean;
          integrations: Array<{ type: string; created_at?: string }>;
          recentNote: { title: string; created_at: string; status: string; id: string } | null;
        } = {
          hasAIContext: false,
          hasReleaseNote: false,
          hasPublishedNote: false,
          integrations: [],
          recentNote: null,
        };

        // AI Context
        if (aiContextResult.status === 'fulfilled') {
          const aiContextData = aiContextResult.value as { data?: { aiContext?: { id: string } } };
          newData.hasAIContext = !!aiContextData?.data?.aiContext?.id;
        }

        // Release Notes
        if (releaseNotesResult.status === 'fulfilled') {
          const releaseNotesData = releaseNotesResult.value as { data?: Array<{ status: string }> };
          const notes = releaseNotesData?.data || [];
          newData.hasReleaseNote = notes.length > 0;
          newData.hasPublishedNote = notes.some((n) => n.status === 'published');
        }

        // Integrations
        if (integrationsResult.status === 'fulfilled') {
          const integrationsData = integrationsResult.value as { data?: Array<{ type: string; created_at?: string }> };
          newData.integrations = integrationsData?.data || [];
        }

        // Recent Note
        if (recentNoteResult.status === 'fulfilled') {
          const recentNoteData = recentNoteResult.value as { data?: { title: string; created_at: string; status: string; id: string } | null };
          newData.recentNote = recentNoteData?.data || null;
        }

        setDashboardData(newData);
        setIsReady(true);

      } catch (error) {
        console.error('Dashboard data fetch error:', error);
        // Still show UI even if some data fails
        setIsReady(true);
      }
    };

    loadDashboardData();
  }, [user?.id, organization?.id]); // ✅ Removed dashboardData from dependencies

  // Pick random tip on mount
  useEffect(() => {
    setTip(didYouKnowTips[Math.floor(Math.random() * didYouKnowTips.length)]);
  }, [didYouKnowTips]);

  // Calculate all derived values (hooks must be called before any conditional returns)
  const checklist = [
    { label: 'Connect an integration', done: dashboardData.integrations.length > 0 },
    { label: 'Configure AI context', done: dashboardData.hasAIContext },
    { label: 'Create your first release note', done: dashboardData.hasReleaseNote },
    { label: 'Publish your first note', done: dashboardData.hasPublishedNote },
  ];

  const completedSteps = checklist.filter(c => c.done).length;
  const totalSteps = checklist.length;

  // Map integrations by type
  const integrationsByType = dashboardData.integrations.reduce((acc, i) => {
    acc[i.type] = i;
    return acc;
  }, {} as Record<string, { type: string; created_at?: string }>);

  // Personalized greeting
  const profile = useAuthStore(state => state.profile);
  const displayName = profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email || 'there';
  const orgName = useAuthStore(state => state.organization?.name) || '';
  const initials = (profile?.first_name && profile?.last_name 
    ? `${profile.first_name} ${profile.last_name}`
    : user?.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();

  // Don't show anything until ready (after all hooks are called)
  if (!isReady) {
    return <div className="min-h-screen" />; // Empty div to maintain hook consistency
  }

  return (
    <div className="px-8 py-0 w-full flex flex-col items-start gap-8">
      {/* Welcome & Progress */}
      <div className="w-full flex flex-col gap-2 pt-8 pb-2">
        <div className="flex items-center gap-4 mb-2 justify-between w-full">
          <div className="flex items-center gap-4">
            <span className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">{initials}</span>
            <div className="flex flex-col">
              <span className="text-xl font-semibold text-default-font">Welcome back, {displayName}!</span>
              {orgName && <span className="text-sm text-neutral-500">{orgName}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/notifications" title="Notifications">
              <IconButton icon={<FeatherBell className="w-5 h-5 text-neutral-700" />} aria-label="Notifications" />
            </Link>
            <Link href="/dashboard/settings" title="Settings">
              <IconButton icon={<FeatherSettings className="w-5 h-5 text-neutral-700" />} aria-label="Settings" />
            </Link>
          </div>
        </div>
        <span className="text-base text-neutral-500">Let&apos;s get your release notes workflow humming.</span>
        {completedSteps < totalSteps && (
          <div className="flex items-center gap-3 mt-2">
            <div className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden">
              <div className="h-2 bg-brand-600 rounded-full transition-all" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
            </div>
            <span className="text-xs text-neutral-500">{completedSteps}/{totalSteps} steps complete</span>
          </div>
        )}
        {/* Quick Actions Row */}
        <div className="flex gap-4 mt-4">
          <Link href="/dashboard/releases/start" title="Create Release Note">
            <Button size="small" variant="brand-primary" icon={<FeatherPlus className="w-4 h-4" />} aria-label="Create Release Note" />
          </Link>
          <Link href="/dashboard/integrations" title="Manage Integrations">
            <Button size="small" variant="neutral-secondary" icon={<FeatherSettings className="w-4 h-4" />} aria-label="Manage Integrations" />
          </Link>
          <Link href="/dashboard/ai-context" title="Configure AI Context">
            <Button size="small" variant="neutral-secondary" icon={<FeatherZap className="w-4 h-4" />} aria-label="Configure AI Context" />
          </Link>
        </div>
      </div>

      {/* Get Started Checklist - Only show if not all steps completed */}
      {completedSteps < totalSteps && (
        <div className="w-full rounded-xl border border-neutral-200 bg-white px-8 py-6 flex flex-col gap-4">
          <span className="text-lg font-semibold text-default-font mb-1">Get Started</span>
          <ol className="flex flex-col gap-3">
            {checklist.map((item, i) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className={`w-5 h-5 flex items-center justify-center rounded-full border ${item.done ? 'bg-green-100 border-green-400 text-green-700' : 'bg-neutral-100 border-neutral-300 text-neutral-400'}`}>{item.done ? '✓' : i + 1}</span>
                <span className={`text-base ${item.done ? 'line-through text-neutral-400' : 'text-default-font'}`}>{item.label}</span>
                {/* Contextual next actions */}
                {!item.done && item.label === 'Configure AI context' && (
                  <Link href="/dashboard/ai-context">
                    <Button size="small" variant="neutral-secondary" className="ml-2">Configure</Button>
                  </Link>
                )}
                {!item.done && item.label === 'Create your first release note' && (
                  <Link href="/dashboard/releases/start">
                    <Button size="small" variant="neutral-secondary" className="ml-2">Create</Button>
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Integrations Section */}
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-lg font-semibold text-default-font mb-1">
          Integrations Status
        </span>
        <div className="flex w-full flex-col gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-8">
          {INTEGRATION_TYPES.map((meta) => {
            const integration = integrationsByType[meta.type];
            const isConnected = !!integration;
            return (
              <div key={meta.type} className="flex flex-col md:flex-row md:items-center justify-between w-full py-3 border-b last:border-b-0 gap-2">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-neutral-100 icon-perfect-center text-neutral-700">
                    <div>
                      {meta.icon}
                    </div>
                  </span>
                  <div>
                    <span className="text-base font-medium text-default-font">{meta.name}</span>
                    <span className="block text-xs text-neutral-500">{meta.description}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-2 md:mt-0">
                  <span className={`text-xs px-2 py-1 rounded-full ${isConnected ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>{isConnected ? 'Connected' : 'Not Connected'}</span>
                  {isConnected && integration.created_at && (
                    <span className="text-xs text-neutral-500">Last sync: {new Date(integration.created_at).toLocaleDateString()}</span>
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
              <IconWithBackground size="large" icon={<FeatherLink className="w-6 h-6 text-neutral-700" />} />
              <span className="text-base text-neutral-500">No integrations connected yet.</span>
              <Link href="/dashboard/integrations">
                <Button className="text-sm px-4 py-2">Connect Integration</Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="w-full rounded-xl border border-neutral-200 bg-white px-8 py-6 flex flex-col gap-2">
        <span className="text-lg font-semibold text-default-font mb-1">Recent Activity</span>
        {dashboardData.recentNote ? (
          <div className="flex flex-col gap-1">
            <span className="text-base font-medium text-default-font">{dashboardData.recentNote.title}</span>
            <span className="text-xs text-neutral-500">{new Date(dashboardData.recentNote.created_at).toLocaleDateString()} &middot; {dashboardData.recentNote.status.charAt(0).toUpperCase() + dashboardData.recentNote.status.slice(1)}</span>
            <Link href={`/dashboard/releases/editor/${dashboardData.recentNote.id}`} className="mt-1">
              <Button size="small" variant="neutral-secondary">View/Edit</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-base text-neutral-500">No recent activity yet. Once you publish release notes, you&apos;ll see them here!</span>
            <Link href="/dashboard/releases/start">
              <Button size="small" variant="brand-primary">Create a Release Note</Button>
            </Link>
          </div>
        )}
      </div>

      {/* Tips Section */}
      <div className="w-full rounded-xl border border-neutral-200 bg-white px-8 py-6 flex flex-col gap-2">
        <span className="text-lg font-semibold text-default-font mb-1">Did you know?</span>
        <span className="text-base text-neutral-500">{tip}</span>
      </div>
    </div>
  );
}