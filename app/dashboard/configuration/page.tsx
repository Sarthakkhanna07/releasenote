"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useAuthStore, useAuthSelectors } from "@/lib/store";
import { toast } from "@/lib/toast";
import { handleApiError, handleAsyncOperation } from "@/lib/error-handler-standard";
import { IconButton } from "@/subframe-ui/components/IconButton";
import { FeatherX, FeatherHelpCircle } from "@subframe/core";
import { Alert } from "@/subframe-ui/components/Alert";
import { TextArea } from "@/subframe-ui/components/TextArea";
import { Select } from "@/subframe-ui/components/Select";
import { Button } from "@/subframe-ui/components/Button";

// Type for organization settings
type OrgSettings = {
  companyDetails?: string
  ai_tone?: string
}

export default function ConfigurationPage() {
  const user = useAuthStore((state) => state.user);
  const { isLoading: authLoading } = useAuthSelectors();
  const orgId = user?.id;

  const [settings, setSettings] = useState({ companyDetails: "", ai_tone: "" });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Debug logs
  console.log("user", user);
  console.log("authLoading", authLoading);
  console.log("orgId", orgId);
  console.log("settings", settings);
  console.log("isLoading", isLoading);
  console.log("isSaving", isSaving);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${orgId}/settings`);
      if (!response.ok) {
        throw new Error("Failed to fetch settings");
      }
      const data = await response.json();
      setSettings({
        companyDetails: data.settings.companyDetails || "",
        ai_tone: data.settings.ai_tone || "",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load settings";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    if (!authLoading) fetchSettings();
  }, [authLoading, fetchSettings]);

  // Handle input changes
  const handleCompanyDetailsChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setSettings((prev) => ({ ...prev, companyDetails: event.target.value }));
  };
  const handleToneChange = (value: string) => {
    setSettings((prev) => ({ ...prev, ai_tone: value }));
  };

  // Handle save
  const handleSave = async () => {
    if (!orgId) return;
    setIsSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/organizations/${orgId}/settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      if (!response.ok) {
        throw new Error("Failed to save settings");
      }
      const data = await response.json();
      setSettings(data.settings);
      const successText = "Settings saved successfully!";
      setSuccessMessage(successText);
      toast.success(successText);
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to save settings";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-start gap-6 bg-default-background px-6 py-6 mobile:container mobile:max-w-none">
      <div className="flex w-full flex-col items-start gap-1">
        <span className="w-full text-heading-2 font-heading-2 text-default-font">
          Configuration
        </span>
        <span className="w-full text-body font-body text-subtext-color">
          Manage your organization settings and AI preferences
        </span>
      </div>
      <div className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-center gap-6 bg-default-background py-12 shadow-sm">
        <div className="flex w-full max-w-[576px] flex-col items-start gap-12">
          <div className="flex w-full flex-col items-start gap-6">
            <div className="flex w-full items-center gap-2">
              <span className="grow shrink-0 basis-0 text-heading-3 font-heading-3 text-default-font">
                Organization Settings
              </span>
            </div>
            <Alert
              variant="brand"
              title="Configure your organization"
              description="These settings will be used to customize AI-generated release notes for your organization."
              actions={
                <IconButton
                  size="medium"
                  icon={<FeatherX />}
                  onClick={() => setError(null)}
                />
              }
            />
            {error && (
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
            )}
            {successMessage && (
              <Alert
                variant="success"
                title="Success"
                description={successMessage}
                actions={
                  <IconButton
                    size="medium"
                    icon={<FeatherX />}
                    onClick={() => setSuccessMessage(null)}
                  />
                }
              />
            )}
            <div className="flex w-full flex-col items-start gap-6">
              <TextArea
                label="Company Details"
                helpText="Provide information about your company that will help generate more relevant content"
              >
                <TextArea.Input
                  className="h-auto min-h-[112px] w-full flex-none"
                  placeholder="Enter your company details..."
                  value={settings.companyDetails}
                  onChange={handleCompanyDetailsChange}
                  disabled={isSaving}
                />
              </TextArea>
              <Select
                label="AI Tone"
                placeholder="Choose a tone"
                helpText="Select the writing style for AI-generated content"
                value={settings.ai_tone || undefined}
                onValueChange={handleToneChange}
                disabled={isSaving}
              >
                <Select.Item value="formal">formal</Select.Item>
                <Select.Item value="informal">informal</Select.Item>
                <Select.Item value="technical">technical</Select.Item>
                <Select.Item value="marketing-friendly">marketing-friendly</Select.Item>
                <Select.Item value="concise">concise</Select.Item>
              </Select>
            </div>
          </div>
          <div className="flex h-px w-full flex-none flex-col items-center gap-2 bg-neutral-border" />
          <div className="flex w-full flex-col items-start gap-2">
            <div className="flex w-full flex-wrap items-center justify-between">
              <Button
                variant="neutral-tertiary"
                icon={<FeatherHelpCircle />}
                onClick={() => toast.info('Learn more about configuration.')}
              >
                Learn more
              </Button>
              <div className="flex items-center justify-end gap-2">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? "Saving..." : "Save Settings"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}