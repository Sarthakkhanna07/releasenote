"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { useAuthStore } from "@/lib/store/use-auth";
import { slugify } from "@/lib/utils";
import { FeatherArrowRight, FeatherX, FeatherZap, FeatherChevronDown } from "@subframe/core";
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton";
import { Alert } from "@/components/subframe-ui/ui/components/Alert";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/subframe-ui/ui/components/Button";
import { useReleaseNotesStore, useReleaseNotesActions } from '@/lib/store/use-release-notes';

interface SelectTemplateTabProps {
  onTemplateSelected?: (draftId: string) => void;
}

function SelectTemplateTab({ onTemplateSelected }: SelectTemplateTabProps) {
  const router = useRouter();
  const { user, organization } = useAuthStore();
  const { templates, isLoading, error: storeError } = useReleaseNotesStore();
  const { fetchTemplates, createReleaseNote } = useReleaseNotesActions();
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (organization?.id) {
      fetchTemplates(organization.id);
    }
  }, [organization, fetchTemplates]);

  const filteredTemplates = templates.filter((tpl) =>
    tpl.name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleUseTemplate = async (template: any) => {
    if (!organization?.id) {
      setError("No organization found.");
      return;
    }
    setIsCreating(true);
    setError(null);
    try {
      const defaultTitle = `${template.name} ${new Date().toISOString().split("T")[0]}`;
      const newNote = await createReleaseNote({
        organization_id: organization.id,
        title: defaultTitle,
        content_markdown: template.content,
        status: "draft",
      });
      if (!newNote?.id) throw new Error("Failed to create draft");
      if (onTemplateSelected) {
        onTemplateSelected(newNote.id);
      } else {
        router.push(`/dashboard/releases/editor/${newNote.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to create draft");
      setIsCreating(false);
    }
  };

  return (
    <div className="flex w-full flex-col items-start gap-8">
      <Alert
        variant="brand"
        icon={<FeatherZap />}
        title="Start with a Template"
        description="Templates help you maintain consistency and save time. Choose from our collection of professional templates below."
        actions={
          <IconButton size="medium" icon={<FeatherX />} onClick={() => {}} />
        }
      />
      <div className="flex w-full items-center gap-4">
        <Input
          className="h-auto grow shrink-0 basis-0"
          placeholder="Search templates..."
          value={search}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
        />
        <Button
          variant="neutral-tertiary"
          iconRight={<FeatherChevronDown />}
          onClick={() => {}}
        >
          All categories
        </Button>
      </div>
      {error && (
        <div className="w-full rounded-md bg-red-50 p-4 text-red-700 text-sm">{error}</div>
      )}
      {isLoading ? (
        <div className="w-full text-center py-8 text-neutral-400">Loading templates...</div>
      ) : (
        <div className="w-full items-start gap-6 grid grid-cols-2 mobile:grid mobile:grid-cols-1">
          {filteredTemplates.map((template) => (
            <div key={template.id} className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
              <div className="flex w-full flex-col items-start gap-4">
                <div className="flex w-full flex-col items-start gap-2">
                  <span className="text-heading-2 font-heading-2 text-default-font">{template.name}</span>
                  <span className="text-body font-body text-subtext-color">{template.content.slice(0, 80)}...</span>
                </div>
              </div>
              <Button
                icon={<FeatherArrowRight />}
                onClick={() => handleUseTemplate(template)}
                disabled={isCreating}
              >
                {isCreating ? 'Creating...' : 'Use Template'}
              </Button>
            </div>
          ))}
          {filteredTemplates.length === 0 && (
            <div className="col-span-2 w-full text-center py-12 text-neutral-400">No templates found.</div>
          )}
        </div>
      )}
    </div>
  );
}

export default SelectTemplateTab; 