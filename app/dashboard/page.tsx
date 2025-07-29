"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/subframe-ui/components/Button";
import { FeatherBell, FeatherSettings, FeatherFileText, FeatherArrowRight, FeatherLink, FeatherPlus, FeatherZap, FeatherUsers } from "@subframe/core";
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
  const [loadingIntegrations, setLoadingIntegrations] = useState<boolean>(false);
  const [onboardingLoading, setOnboardingLoading] = useState<boolean>(true);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [hasAIContext, setHasAIContext] = useState<boolean>(false);
  const [hasReleaseNote, setHasReleaseNote] = useState<boolean>(false);
  const [hasPublishedNote, setHasPublishedNote] = useState<boolean>(false);
  const [recentNote, setRecentNote] = useState<any | null>(null);
  const didYouKnowTips = [
    'You can use AI to summarize your Jira tickets and generate professional release notes in seconds.',
    'Integrations let you automate release notes from GitHub, Jira, and more.',
    'You can customize your AI context for more tailored release notes.',
    'Publishing release notes keeps your users informed and engaged.',
    'You can manage your integrations anytime from the Integrations page.'
  ];
  const [tip, setTip] = useState(didYouKnowTips[0]);

  useEffect(() => {
    if (!user?.id) return;
    setOnboardingLoading(true);
    setOnboardingError(null);
    const fetchOnboarding = async () => {
      try {
        // Fetch AI context
        const aiRes = await fetch('/api/ai-context');
        const aiJson = await aiRes.json();
        setHasAIContext(!!aiJson.aiContext);
        // Fetch release notes
        const supabase = createClientComponentClient();
        const { data: notes, error } = await supabase
          .from('release_notes')
          .select('id,status')
          .eq('organization_id', user.id);
        if (error) throw error;
        setHasReleaseNote((notes || []).length > 0);
        setHasPublishedNote((notes || []).some((n: any) => n.status === 'published'));
      } catch (err: any) {
        setOnboardingError(err.message || 'Failed to load onboarding progress');
      } finally {
        setOnboardingLoading(false);
      }
    };
    fetchOnboarding();
  }, [user?.id]);

  const checklist = [
    { label: 'Connect an integration', done: integrations.length > 0 },
    { label: 'Configure AI context', done: hasAIContext },
    { label: 'Create your first release note', done: hasReleaseNote },
    { label: 'Publish your first note', done: hasPublishedNote },
  ];
  const completedSteps = checklist.filter(c => c.done).length;
  const totalSteps = checklist.length;
  // --- Fetch integrations ---
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

  // Map integrations by type for quick lookup (for Integrations Status section)
  const integrationsByType = integrations.reduce((acc, i) => {
    acc[i.type] = i;
    return acc;
  }, {} as Record<string, any>);
  // --- Personalized greeting ---
  const displayName = user?.user_metadata?.full_name || user?.email || 'there';
  const orgName = user?.user_metadata?.organization_name || '';
  const initials = (user?.user_metadata?.full_name || user?.email || 'U')
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase();
  // --- Layout ---
  // Fetch recent release note and random tip
  useEffect(() => {
    if (!user?.id) return;
    // Pick a random tip
    setTip(didYouKnowTips[Math.floor(Math.random() * didYouKnowTips.length)]);
    // Fetch most recent release note
    const fetchRecentNote = async () => {
      const supabase = createClientComponentClient();
      const { data: notes } = await supabase
        .from('release_notes')
        .select('id,title,created_at,status')
        .eq('organization_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1);
      setRecentNote(notes && notes.length > 0 ? notes[0] : null);
    };
    fetchRecentNote();
  }, [user?.id]);
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
              <IconButton icon={<FeatherBell />} aria-label="Notifications" />
        </Link>
            <Link href="/dashboard/settings" title="Settings">
              <IconButton icon={<FeatherSettings />} aria-label="Settings" />
        </Link>
      </div>
        </div>
        <span className="text-base text-neutral-500">Let's get your release notes workflow humming.</span>
        <div className="flex items-center gap-3 mt-2">
          <div className="w-48 h-2 bg-neutral-200 rounded-full overflow-hidden">
            <div className="h-2 bg-brand-600 rounded-full transition-all" style={{ width: `${(completedSteps / totalSteps) * 100}%` }} />
          </div>
          <span className="text-xs text-neutral-500">{completedSteps}/{totalSteps} steps complete</span>
      </div>
        {/* Quick Actions Row */}
        <div className="flex gap-4 mt-4">
          <Link href="/dashboard/releases/start" title="Create Release Note">
            <Button size="small" variant="brand-primary" icon={<FeatherPlus />} aria-label="Create Release Note" />
          </Link>
          <Link href="/dashboard/integrations" title="Manage Integrations">
            <Button size="small" variant="neutral-secondary" icon={<FeatherSettings />} aria-label="Manage Integrations" />
          </Link>
          <Link href="/dashboard/ai-context" title="Configure AI Context">
            <Button size="small" variant="neutral-secondary" icon={<FeatherZap />} aria-label="Configure AI Context" />
          </Link>
        </div>
      </div>
      {/* Get Started Checklist */}
      <div className="w-full rounded-xl border border-neutral-200 bg-white px-8 py-6 flex flex-col gap-4">
        <span className="text-lg font-semibold text-default-font mb-1">Get Started</span>
        {onboardingLoading ? (
          <span className="text-base text-neutral-400">Loading your onboarding progress...</span>
        ) : onboardingError ? (
          <span className="text-base text-red-500">{onboardingError}</span>
        ) : completedSteps === totalSteps ? (
          <div className="flex flex-col items-center gap-3 py-6">
            <span className="w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-700 text-3xl">✓</span>
            <span className="text-xl font-semibold text-green-700">You're all set!</span>
            <span className="text-base text-neutral-500 text-center">You've completed all onboarding steps. Start publishing your release notes and keep your users in the loop.</span>
            <Link href="/dashboard/releases/start">
              <Button variant="brand-primary" size="large" className="mt-2">Create a Release Note</Button>
          </Link>
        </div>
        ) : (
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
        )}
      </div>
      {/* Integrations Section (existing code) */}
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-lg font-semibold text-default-font mb-1">
          Integrations Status
        </span>
        <div className="flex w-full flex-col gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-8">
          {loadingIntegrations ? (
            <span className="text-base text-neutral-500">Loading integrations...</span>
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
          <IconWithBackground size="large" icon={<FeatherLink />} />
                  <span className="text-base text-neutral-500">No integrations connected yet.</span>
                  <Link href="/dashboard/integrations">
                    <Button className="text-sm px-4 py-2">Connect Integration</Button>
          </Link>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {/* Recent Activity */}
      <div className="w-full rounded-xl border border-neutral-200 bg-white px-8 py-6 flex flex-col gap-2">
        <span className="text-lg font-semibold text-default-font mb-1">Recent Activity</span>
        {recentNote ? (
          <div className="flex flex-col gap-1">
            <span className="text-base font-medium text-default-font">{recentNote.title}</span>
            <span className="text-xs text-neutral-500">{new Date(recentNote.created_at).toLocaleDateString()} &middot; {recentNote.status.charAt(0).toUpperCase() + recentNote.status.slice(1)}</span>
            <Link href={`/dashboard/releases/editor/${recentNote.id}`} className="mt-1">
              <Button size="small" variant="neutral-secondary">View/Edit</Button>
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-base text-neutral-500">No recent activity yet. Once you publish release notes, you'll see them here!</span>
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