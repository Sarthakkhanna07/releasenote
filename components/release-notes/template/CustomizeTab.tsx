"use client";

import React, { useState, useEffect } from "react";
import { TextField } from "@/components/subframe-ui/ui/components/TextField";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/subframe-ui/ui/components/Button";
import { useReleaseNotesStore, useReleaseNotesActions } from "@/lib/store/use-release-notes";
import { Badge } from "@/components/subframe-ui/ui/components/Badge";
import { FeatherTag, FeatherPlus, FeatherArrowLeft, FeatherArrowRight, FeatherEdit2 } from "@subframe/core";
import { X as CloseIcon } from 'lucide-react';
import { useAuthStore } from "@/lib/store";

interface CustomizeTabProps {
  draftId: string;
  onSaveDraft?: () => void;
  onContinue?: () => void;
}

// Helper to build markdown from all sections
function buildReleaseNoteMarkdown({ title, whatsNew, bugFixes, technicalDetails, customSections }: {
  title: string;
  whatsNew: string;
  bugFixes: string;
  technicalDetails: string;
  customSections: Array<{ heading: string; value: string }>;
}) {
  let md = `# ${title}\n\n`;
  if (whatsNew) md += `## What's New\n${whatsNew}\n\n`;
  if (bugFixes) md += `## Bug Fixes\n${bugFixes}\n\n`;
  if (technicalDetails) md += `## Technical Details\n${technicalDetails}\n\n`;
  if (customSections && customSections.length > 0) {
    for (const section of customSections) {
      if (section.heading && section.value) {
        md += `## ${section.heading}\n${section.value}\n\n`;
      }
    }
  }
  return md.trim();
}

const CustomizeTab: React.FC<CustomizeTabProps> = ({ draftId, onSaveDraft, onContinue }) => {
  const { releaseNotes, isUpdating, error } = useReleaseNotesStore();
  const { updateReleaseNote, fetchReleaseNotes } = useReleaseNotesActions();
  const organization = useAuthStore(state => state.organization);
  const draft = releaseNotes.find(note => note.id === draftId);

  const [title, setTitle] = useState(draft?.title || "");
  const [content, setContent] = useState(draft?.content || "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [whatsNew, setWhatsNew] = useState(draft?.whats_new || "");
  const [bugFixes, setBugFixes] = useState(draft?.bug_fixes || "");
  const [technicalDetails, setTechnicalDetails] = useState(draft?.technical_details || "");
  const [tags, setTags] = useState<string[]>(draft?.tags || []);
  const [customSections, setCustomSections] = useState<Array<{ id: string; heading: string; value: string }>>(draft?.custom_sections || []);
  const [newSectionName, setNewSectionName] = useState("");
  const [newTag, setNewTag] = useState("");

  useEffect(() => {
    setTitle(draft?.title || "");
    setContent(draft?.content || "");
    setWhatsNew(draft?.whats_new || "");
    setBugFixes(draft?.bug_fixes || "");
    setTechnicalDetails(draft?.technical_details || "");
    setTags(draft?.tags || []);
    setCustomSections(draft?.custom_sections || []);
  }, [draftId, draft]);

  const handleAddSection = () => {
    if (!newSectionName.trim()) return;
    setCustomSections([
      ...customSections,
      { id: Date.now().toString(), heading: newSectionName.trim(), value: "" },
    ]);
    setNewSectionName("");
  };

  const handleRemoveSection = (id: string) => {
    setCustomSections(customSections.filter(s => s.id !== id));
  };

  const handleSectionChange = (id: string, value: string) => {
    setCustomSections(customSections.map(s => (s.id === id ? { ...s, value } : s)));
  };

  const handleAddTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) setTags([...tags, tag]);
    setNewTag("");
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  // Save draft only
  const handleSaveDraft = async () => {
    setSaving(true);
    setSaveError(null);
    setSuccess(false);
    try {
      if (!title.trim()) throw new Error("Title is required");
      const content_markdown = buildReleaseNoteMarkdown({
        title,
        whatsNew,
        bugFixes,
        technicalDetails,
        customSections,
      });
      await updateReleaseNote(draftId, {
        title,
        content_markdown,
        tags,
        status: 'draft',
      });
      // Refetch drafts to update the store
      if (organization?.id) {
        await fetchReleaseNotes(organization.id);
      }
      setSuccess(true);
      if (onSaveDraft) onSaveDraft();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  // Save and continue to preview
  const handleContinue = async () => {
    setSaving(true);
    setSaveError(null);
    setSuccess(false);
    try {
      if (!title.trim()) throw new Error("Title is required");
      const content_markdown = buildReleaseNoteMarkdown({
        title,
        whatsNew,
        bugFixes,
        technicalDetails,
        customSections,
      });
      await updateReleaseNote(draftId, {
        title,
        content_markdown,
        tags,
        status: 'draft',
      });
      // Refetch drafts to update the store
      if (organization?.id) {
        await fetchReleaseNotes(organization.id);
      }
      setSuccess(true);
      if (onContinue) onContinue();
    } catch (err: any) {
      setSaveError(err.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  if (!draft) {
    return <div className="text-red-500">Draft not found.</div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
      <div className="bg-neutral-50 border border-neutral-200 rounded-lg p-4 flex items-center gap-3 mb-2">
        <FeatherEdit2 className="text-brand-600" />
        <div>
          <div className="font-semibold text-lg text-default-font">Customize Your Release Note</div>
          <div className="text-sm text-neutral-500">Fill in the sections below to create your release note. Use clear, concise language to describe your changes.</div>
        </div>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()}><CloseIcon className="w-4 h-4" /></Button>
        </div>
      </div>
      <div className="flex flex-col gap-6">
        <div>
          <div className="font-semibold text-base text-default-font mb-1">Release Title</div>
          <TextField className="text-default-font" required>
            <TextField.Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. New Feature Release - April 2024"
            />
          </TextField>
          <div className="text-xs text-neutral-500 mt-1">Give your release note a clear, descriptive title</div>
        </div>
        <div>
          <div className="font-semibold text-base text-default-font mb-1">What's New</div>
          <Textarea
            className="h-32 text-default-font"
            placeholder="List the new features and improvements..."
            value={whatsNew}
            onChange={e => setWhatsNew(e.target.value)}
          />
          <div className="text-xs text-neutral-500 mt-1">Describe the new features and improvements</div>
        </div>
        <div>
          <div className="font-semibold text-base text-default-font mb-1">Bug Fixes</div>
          <Textarea
            className="h-32 text-default-font"
            placeholder="Document the fixed bugs and issues..."
            value={bugFixes}
            onChange={e => setBugFixes(e.target.value)}
          />
          <div className="text-xs text-neutral-500 mt-1">List any resolved issues</div>
        </div>
        <div>
          <div className="font-semibold text-base text-default-font mb-1">Technical Details</div>
          <Textarea
            className="h-32 text-default-font"
            placeholder="Add technical implementation details..."
            value={technicalDetails}
            onChange={e => setTechnicalDetails(e.target.value)}
          />
          <div className="text-xs text-neutral-500 mt-1">Include any technical specifications or API changes</div>
        </div>
        {/* Dynamic Custom Sections */}
        {customSections.map(section => (
          <div key={section.id} className="relative">
            <div className="flex items-center mb-1">
              <input
                className="font-semibold text-base text-default-font bg-transparent border-b border-neutral-200 focus:outline-none mr-2"
                value={section.heading}
                onChange={e => setCustomSections(customSections.map(s => s.id === section.id ? { ...s, heading: e.target.value } : s))}
                placeholder="Section Heading"
                aria-label="Section Heading"
              />
              <Button variant="ghost" size="icon" onClick={() => handleRemoveSection(section.id)}><CloseIcon className="w-4 h-4 text-neutral-400" /></Button>
            </div>
            <Textarea
              className="h-32 text-default-font"
              placeholder="Section content..."
              value={section.value}
              onChange={e => handleSectionChange(section.id, e.target.value)}
            />
          </div>
        ))}
        <div className="flex items-center gap-2">
          <input
            className="border border-neutral-200 rounded px-2 py-1 text-sm text-default-font focus:outline-none"
            placeholder="Add custom section..."
            value={newSectionName}
            onChange={e => setNewSectionName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddSection(); } }}
          />
          <Button variant="neutral-secondary" size="small" icon={<FeatherPlus />} onClick={handleAddSection}>Add Section</Button>
        </div>
        {/* Tags/Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-2">
          {tags.map((tag, idx) => (
            <Badge key={idx} variant="neutral" icon={<FeatherTag />}>
              {tag}
              <button className="ml-1 text-neutral-400 hover:text-red-500" onClick={() => handleRemoveTag(tag)} aria-label="Remove tag">
                <CloseIcon className="w-3 h-3 inline" />
              </button>
            </Badge>
          ))}
          <input
            className="border border-neutral-200 rounded px-2 py-1 text-sm text-default-font focus:outline-none"
            placeholder="Add tag..."
            value={newTag}
            onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddTag(); } }}
          />
          <Button variant="neutral-tertiary" size="small" icon={<FeatherPlus />} onClick={handleAddTag}>Add Tag</Button>
        </div>
      </div>
      {saveError && <div className="text-red-500 text-sm mt-2">{saveError}</div>}
      {success && <div className="text-green-600 text-sm mt-2">Draft saved!</div>}
      <div className="flex w-full items-center justify-between mt-8">
        <Button
          variant="neutral-secondary"
          icon={<FeatherArrowLeft />}
          onClick={() => window.history.back()}
        >
          Back
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={handleSaveDraft} disabled={saving || isUpdating}>
            {saving || isUpdating ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            icon={<FeatherArrowRight />}
            onClick={handleContinue}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CustomizeTab; 