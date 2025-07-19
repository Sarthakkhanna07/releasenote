"use client";

import React, { useState, useEffect } from "react";
import { FeatherZap, FeatherX, FeatherHelpCircle } from "@subframe/core";
import { Button, IconButton, Alert, TextArea, TextField } from "@/components/subframe-ui/ui";
import { toast } from "sonner";

interface AIContext {
  id?: string;
  organization_id?: string;
  system_prompt: string;
  user_prompt_template: string;
  example_output: string;
  tone?: string;
  audience?: string;
  output_format?: string;
  created_at?: string;
  updated_at?: string;
}

export default function AiContextConfig() {
  const [context, setContext] = useState<AIContext | null>(null);
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
        setContext(
          json.aiContext || {
            system_prompt: "",
            user_prompt_template: "",
            example_output: "",
            tone: "",
            audience: "",
            output_format: "",
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
    if (!context) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/ai-context", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(context),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save AI context");
      setContext(json.aiContext);
      toast.success("AI context saved");
    } catch (err: any) {
      setError(err.message || "Failed to save AI context");
      toast.error(err.message || "Failed to save AI context");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setContext({
      system_prompt: "",
      user_prompt_template: "",
      example_output: "",
      tone: "",
      audience: "",
      output_format: "",
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
                  <FeatherZap className="text-heading-1 font-heading-1 text-brand-600" />
                  <span className="text-heading-1 font-heading-1 text-brand-600">
                    AI Context Settings
                  </span>
                </div>
                <span className="text-heading-3 font-heading-3 text-neutral-500">
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
            <Alert
              variant="brand"
              title="Configure AI Behavior"
              description="These settings determine how the AI assistant generates and formats content. Configure the prompts, tone, and output format to match your needs."
              actions={
                <IconButton
                  size="medium"
                  icon={<FeatherX />}
                  onClick={() => setError(null)}
                />
              }
            />
          </div>
          <div className="flex w-full flex-col items-start gap-16">
            <div className="flex w-full flex-col items-start gap-8">
              <div className="flex w-full items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-heading-2 font-heading-2 text-brand-600">
                  AI Prompts
                </span>
                <Button
                  variant="neutral-tertiary"
                  icon={<FeatherHelpCircle />}
                  onClick={() => window.open('https://docs.releasenote.ai', '_blank')}
                >
                  View documentation
                </Button>
              </div>
              <TextArea
                className="h-auto w-auto min-w-[448px] flex-none"
                label="System Prompt"
                helpText="Instructions that define the AI's role and behavior"
              >
                <TextArea.Input
                  name="system_prompt"
                  className="h-auto min-h-[160px] w-full flex-none"
                  placeholder="You are an expert technical writer specializing in release notes..."
                  value={context?.system_prompt || ""}
                  onChange={handleChange}
                />
              </TextArea>
              <TextArea
                className="h-auto w-auto min-w-[448px] flex-none"
                label="User Prompt Template"
                helpText="Template for user requests with placeholders"
              >
                <TextArea.Input
                  name="user_prompt_template"
                  className="h-auto min-h-[112px] w-full flex-none"
                  placeholder="Generate release notes for the following changes: {{changes}}"
                  value={context?.user_prompt_template || ""}
                  onChange={handleChange}
                />
              </TextArea>
              <TextArea
                className="h-auto w-auto min-w-[448px] flex-none"
                label="Example Output"
                helpText="Sample of desired AI response format"
              >
                <TextArea.Input
                  name="example_output"
                  className="h-auto min-h-[144px] w-full flex-none"
                  placeholder="# Release Notes - v1.0.0..."
                  value={context?.example_output || ""}
                  onChange={handleChange}
                />
              </TextArea>
            </div>
            <div className="flex w-full flex-col items-start gap-8">
              <div className="flex w-full items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-heading-2 font-heading-2 text-brand-600">
                  AI Behavior
                </span>
              </div>
              <TextField
                className="h-auto w-auto min-w-[448px] flex-none"
                label="Tone"
                helpText="Writing style for generated content"
              >
                <TextField.Input
                  name="tone"
                  placeholder="e.g. professional, technical, casual"
                  value={context?.tone || ""}
                  onChange={handleChange}
                />
              </TextField>
              <TextField
                className="h-auto w-auto min-w-[448px] flex-none"
                label="Audience"
                helpText="Target readers for the content"
              >
                <TextField.Input
                  name="audience"
                  placeholder="e.g. developers, business users"
                  value={context?.audience || ""}
                  onChange={handleChange}
                />
              </TextField>
              <TextField
                className="h-auto w-auto min-w-[448px] flex-none"
                label="Output Format"
                helpText="Desired format for generated content"
              >
                <TextField.Input
                  name="output_format"
                  placeholder="e.g. markdown, html"
                  value={context?.output_format || ""}
                  onChange={handleChange}
                />
              </TextField>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
