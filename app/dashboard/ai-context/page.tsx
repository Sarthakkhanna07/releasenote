"use client";

import React, { useState, useEffect } from "react";
import { FeatherZap, FeatherX, FeatherHelpCircle } from "@subframe/core";
import { Button, IconButton, Alert } from "@/components/subframe-ui/ui";
import { toast } from "sonner";

interface AIContext {
  id?: string;
  organization_id?: string;
  system_prompt?: string;
  user_prompt_template?: string;
  example_output?: string;
  tone: 'professional' | 'casual' | 'technical' | 'enthusiastic' | 'formal';
  audience: 'developers' | 'business' | 'users' | 'mixed' | 'executives';
  output_format: 'markdown' | 'html';
  language?: string;
  include_emojis?: boolean;
  include_metrics?: boolean;
  brevity_level?: 'concise' | 'detailed' | 'comprehensive';
  created_at?: string;
  updated_at?: string;
}

interface OrganizationInfo {
  name: string;
  id: string;
}

export default function AiContextConfig() {
  const [context, setContext] = useState<AIContext | null>(null);
  const [organization, setOrganization] = useState<OrganizationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContext = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/ai-context");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch AI context");
        
        // Set organization info - handle both data structures
        const organization = json.data?.organization || json.organization;
        if (organization) {
          setOrganization(organization);
        }
        
        // Set AI context with proper defaults - handle both data structures
        const aiContext = json.data?.aiContext || json.aiContext;
        setContext(
          aiContext || {
            tone: "professional",
            audience: "mixed",
            output_format: "markdown",
            language: "English",
            include_emojis: false,
            include_metrics: true,
            brevity_level: "detailed"
          }
        );
      } catch (err: any) {
        setError(err.message || "Failed to fetch AI context");
        toast.error(err.message || "Failed to fetch AI context");
      } finally {
        setLoading(false);
      }
    };
    fetchContext();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (!context) return;
    setContext({ ...context, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    if (!context || !organization) return;
    setSaving(true);
    setError(null);
    try {
      // Prepare data with organization_id and all fields (database schema updated)
      const dataToSave = {
        organization_id: organization.id,
        // Required fields with defaults
        system_prompt: context.system_prompt || '',
        user_prompt_template: context.user_prompt_template || '',
        // Core AI behavior fields
        tone: context.tone,
        audience: context.audience,
        output_format: context.output_format,
        brevity_level: context.brevity_level,
        // Additional options (now supported in database)
        language: context.language || 'English',
        include_emojis: context.include_emojis || false,
        include_metrics: context.include_metrics !== false, // Default to true
        // Optional fields
        example_output: context.example_output || null
      };
      
      const res = await fetch("/api/ai-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });
      const json = await res.json();
      
      if (!res.ok) {
        // Extract error message from the API response structure
        const errorMessage = json.error?.message || json.error || json.message || "Failed to save AI context";
        throw new Error(errorMessage);
      }
      
      // Handle both data structures for the response
      const savedContext = json.data?.aiContext || json.aiContext || json;
      setContext(savedContext);
      toast.success("AI context saved successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save AI context");
      toast.error(err.message || "Failed to save AI context");
    } finally {
      setSaving(false);
    }
  };

  const handleSelectChange = (name: string, value: string) => {
    if (!context) return;
    setContext({ ...context, [name]: value });
  };

  const handleCheckboxChange = (name: string, checked: boolean) => {
    if (!context) return;
    setContext({ ...context, [name]: checked });
  };

  const handleReset = () => {
    setContext({
      tone: "professional",
      audience: "mixed",
      output_format: "markdown",
      language: "English",
      include_emojis: false,
      include_metrics: true,
      brevity_level: "detailed"
    });
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Alert
          variant="error"
          title="Error"
          description={error}
          actions={
            <IconButton
              size="medium"
              icon={<FeatherX />}
              onClick={() => setError(null)}
            />
          }
        />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-start bg-default-background">
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-16 bg-default-background px-6 py-16">
        <div className="flex w-full max-w-[1024px] flex-col items-start gap-16">
          <div className="flex w-full flex-col items-start gap-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-3">
                  <FeatherZap className="w-6 h-6 text-brand-600" />
                  <span className="text-2xl font-semibold text-brand-600">
                    AI Context Settings
                  </span>
                </div>
                <span className="text-sm text-neutral-500">
                  Configure how AI generates your release notes
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="neutral-secondary"
                  onClick={handleReset}
                >
                  Reset defaults
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save changes"}
                </Button>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col items-start gap-8">
            <div className="flex w-full items-center justify-between pb-3 border-b border-neutral-200">
              <span className="text-base font-semibold text-brand-600">
                AI Behavior
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-font">
                  Writing Tone
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                  value={context?.tone || "professional"}
                  onChange={(e) => handleSelectChange("tone", e.target.value)}
                >
                  <option value="professional">Professional - Authoritative and business-appropriate</option>
                  <option value="casual">Casual - Approachable and conversational</option>
                  <option value="technical">Technical - Precise and detailed for developers</option>
                  <option value="enthusiastic">Enthusiastic - Energetic and engaging</option>
                  <option value="formal">Formal - Structured and ceremonial</option>
                </select>
                <p className="text-xs text-neutral-500">How the AI should write and communicate</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-font">
                  Target Audience
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                  value={context?.audience || "mixed"}
                  onChange={(e) => handleSelectChange("audience", e.target.value)}
                >
                  <option value="developers">Developers - Technical teams and engineers</option>
                  <option value="business">Business - Stakeholders and decision makers</option>
                  <option value="users">Users - End users and customers</option>
                  <option value="mixed">Mixed - Diverse audience with varying technical knowledge</option>
                  <option value="executives">Executives - C-level and strategic leadership</option>
                </select>
                <p className="text-xs text-neutral-500">Who will be reading the generated content</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-font">
                  Output Format
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                  value={context?.output_format || "markdown"}
                  onChange={(e) => handleSelectChange("output_format", e.target.value)}
                >
                  <option value="markdown">Markdown - Clean formatting with markdown syntax</option>
                  <option value="html">HTML - Rich formatting with HTML tags</option>
                </select>
                <p className="text-xs text-neutral-500">Format for the generated content</p>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-font">
                  Content Length
                </label>
                <select
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                  value={context?.brevity_level || "detailed"}
                  onChange={(e) => handleSelectChange("brevity_level", e.target.value)}
                >
                  <option value="concise">Concise - Brief and focused descriptions</option>
                  <option value="detailed">Detailed - Comprehensive explanations with context</option>
                  <option value="comprehensive">Comprehensive - Thorough coverage with examples</option>
                </select>
                <p className="text-xs text-neutral-500">How much detail to include</p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-4">
              <div className="flex w-full items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-base font-semibold text-brand-600">
                  Additional Options
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="include_emojis"
                  checked={context?.include_emojis || false}
                  onChange={(e) => handleCheckboxChange("include_emojis", e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-600"
                />
                <label htmlFor="include_emojis" className="text-sm text-default-font">
                  Include emojis for visual appeal and engagement
                </label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="include_metrics"
                  checked={context?.include_metrics !== false}
                  onChange={(e) => handleCheckboxChange("include_metrics", e.target.checked)}
                  className="w-4 h-4 text-brand-600 border-neutral-300 rounded focus:ring-brand-600"
                />
                <label htmlFor="include_metrics" className="text-sm text-default-font">
                  Include specific numbers and measurable improvements when available
                </label>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-default-font">
                  Language
                </label>
                <input
                  type="text"
                  name="language"
                  className="w-full max-w-xs px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                  value={context?.language || ""}
                  onChange={handleChange}
                  placeholder="e.g. English, Spanish, French"
                />
                <p className="text-xs text-neutral-500">Language for generated content</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
