"use client";

import React, { useState, useEffect } from "react";
import { useReleaseNotesStore, useReleaseNotesActions } from "@/lib/store/use-release-notes";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/subframe-ui/ui/components/Button";
import { Alert } from "@/components/subframe-ui/ui/components/Alert";
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton";
import { FeatherSend, FeatherX, FeatherArrowLeft } from "@subframe/core";

interface PublishTabProps {
  draftId: string;
  onBack?: () => void;
  onSaveDraft?: () => void;
}

const PublishTab: React.FC<PublishTabProps> = ({ draftId, onBack, onSaveDraft }) => {
  const { releaseNotes, isUpdating } = useReleaseNotesStore();
  const { updateReleaseNoteApi, publishReleaseNote } = useReleaseNotesActions();
  const draft = releaseNotes.find(note => note.id === draftId);

  const [isPublic, setIsPublic] = useState(false);
  const [notifySubscribers, setNotifySubscribers] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (draft) {
      setIsPublic(!!draft.is_public);
    }
  }, [draft]);

  const handlePublish = async () => {
    setPublishing(true);
    setError(null);
    setSuccess(false);
    try {
      // Update visibility first if changed
      if (draft && draft.is_public !== isPublic) {
        await updateReleaseNoteApi(draft.id, { is_public: isPublic });
      }
      // Publish the note
      await publishReleaseNote(draftId);
      // Optionally, trigger notifications (email) if checked
      if (notifySubscribers) {
        await fetch(`/api/release-notes/${draftId}/notify`, { method: "POST" });
      }
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  if (!draft) {
    return <div className="text-red-500">Draft not found.</div>;
  }

  return (
    <div className="flex w-full flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-white px-8 py-8">
      <Alert
        variant="brand"
        icon={<FeatherSend />}
        title="Ready to Publish"
        description="Review your publishing options before releasing this note to your audience."
        actions={
          <IconButton
            size="medium"
            icon={<FeatherX />}
            onClick={() => setError(null)}
          />
        }
      />
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-2 font-heading-2 text-default-font">Visibility</span>
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <span className="text-body-bold font-body-bold text-default-font">Make this release note public</span>
            <span className="text-body font-body text-subtext-color">If checked, the note will be visible on your public changelog page</span>
          </div>
          <Switch checked={isPublic} onCheckedChange={setIsPublic} />
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-4">
        <span className="text-heading-2 font-heading-2 text-default-font">Distribution</span>
        <div className="flex w-full items-center justify-between">
          <div className="flex flex-col items-start gap-1">
            <span className="text-body-bold font-body-bold text-default-font">Send to all subscribers via email</span>
            <span className="text-body font-body text-subtext-color">Active subscribers will receive this release note in their inbox</span>
          </div>
          <Switch checked={notifySubscribers} onCheckedChange={setNotifySubscribers} />
        </div>
        <div className="flex w-full items-center justify-between rounded-md border border-solid border-neutral-border bg-neutral-50 px-4 py-3">
          <div className="flex flex-col items-start gap-1">
            <span className="text-body-bold font-body-bold text-default-font">Share to Slack</span>
            <span className="text-body font-body text-subtext-color">Coming soon</span>
          </div>
          <Switch checked={false} disabled onCheckedChange={() => {}} />
        </div>
      </div>
      {error && <div className="text-red-500 text-sm">{error}</div>}
      {success && <div className="text-green-600 text-sm">Release note published!</div>}
      <div className="flex w-full items-center justify-between">
        <Button
          variant="neutral-secondary"
          icon={<FeatherArrowLeft />}
          onClick={onBack}
        >
          Back to Preview
        </Button>
        <div className="flex items-center gap-2">
          <Button
            variant="neutral-secondary"
            onClick={onSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            icon={<FeatherSend />}
            onClick={handlePublish}
            disabled={publishing || isUpdating}
          >
            {publishing || isUpdating ? "Publishing..." : "Publish Now"}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PublishTab; 