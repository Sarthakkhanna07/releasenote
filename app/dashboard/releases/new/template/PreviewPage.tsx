"use client";

import React from "react";
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout";
import { Tabs } from "@/components/subframe-ui/ui/components/Tabs";
import { Alert } from "@/components/subframe-ui/ui/components/Alert";
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton";
import { Button } from "@/components/subframe-ui/ui/components/Button";
import { Badge } from "@/components/subframe-ui/ui/components/Badge";
import { FeatherFileText, FeatherEdit2, FeatherEye, FeatherSend, FeatherX, FeatherCalendar, FeatherTag, FeatherArrowLeft, FeatherArrowRight } from "@subframe/core";
import PreviewTab from '@/components/release-notes/template/PreviewTab';

interface PreviewPageProps {
  draftId: string;
  onBack?: () => void;
  onContinue?: () => void;
  onSaveDraft?: () => void;
}

const PreviewPage: React.FC<PreviewPageProps> = ({ draftId, onBack, onContinue, onSaveDraft }) => {
  // This page is a beautiful shell for the real PreviewTab logic
  // It keeps all navigation, tabs, and alert UI from your design
  // It passes the draftId to PreviewTab for live preview
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full flex-col items-start">
        <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-6 py-6">
          <div className="flex flex-col items-start gap-2">
            <span className="text-heading-1 font-heading-1 text-default-font">
              Create Release Note
            </span>
            <span className="text-body font-body text-subtext-color">
              Preview your release note before publishing
            </span>
          </div>
        </div>
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-8 bg-default-background px-6 py-12">
          <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
            <Tabs>
              <Tabs.Item icon={<FeatherFileText />}>Select Template</Tabs.Item>
              <Tabs.Item icon={<FeatherEdit2 />}>Customize</Tabs.Item>
              <Tabs.Item active={true} icon={<FeatherEye />}>
                Preview
              </Tabs.Item>
              <Tabs.Item icon={<FeatherSend />}>Publish</Tabs.Item>
            </Tabs>
            <Alert
              variant="brand"
              icon={<FeatherEye />}
              title="Preview Mode"
              description="Review how your release note will appear to your audience. Make any final adjustments before publishing."
              actions={
                <IconButton
                  size="medium"
                  icon={<FeatherX />}
                  onClick={() => {}}
                />
              }
            />
            {/* Live preview of the current draft */}
            <div className="flex w-full flex-col items-start gap-8 rounded-md border border-solid border-neutral-border bg-white px-8 py-8">
              <PreviewTab draftId={draftId} />
              {/* Example: badges, tags, etc. can be added here if needed */}
              <div className="flex items-center gap-2">
                <Badge variant="neutral" icon={<FeatherTag />}>Feature</Badge>
                <Badge variant="neutral" icon={<FeatherTag />}>Bug Fix</Badge>
              </div>
            </div>
            <div className="flex w-full items-center justify-between">
              <Button
                variant="neutral-secondary"
                icon={<FeatherArrowLeft />}
                onClick={onBack}
              >
                Back to Edit
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="neutral-secondary"
                  onClick={onSaveDraft}
                >
                  Save Draft
                </Button>
                <Button
                  icon={<FeatherArrowRight />}
                  onClick={onContinue}
                >
                  Continue to Publish
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
};

export default PreviewPage; 