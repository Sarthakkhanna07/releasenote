"use client";

import React, { useState, useEffect, Suspense } from "react";
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout";
import { Tabs } from "@/components/subframe-ui/ui/components/Tabs";
import { FeatherFileText, FeatherEdit2, FeatherEye, FeatherSend } from "@subframe/core";
import SelectTemplateTab from "@/components/release-notes/template/SelectTemplateTab";
import CustomizeTab from "@/components/release-notes/template/CustomizeTab";
import PreviewTab from "@/components/release-notes/template/PreviewTab";
import PublishTab from "@/components/release-notes/template/PublishTab";
import { useSearchParams } from "next/navigation";

const steps = ["select", "customize", "preview", "publish"] as const;
type Step = typeof steps[number];

const stepLabels = [
  { label: "Select Template", icon: <FeatherFileText /> },
  { label: "Customize", icon: <FeatherEdit2 /> },
  { label: "Preview", icon: <FeatherEye /> },
  { label: "Publish", icon: <FeatherSend /> },
];

const TemplateFlowPageContent: React.FC = () => {
  const searchParams = useSearchParams();
  const initialDraftId = searchParams.get("draftId");
  const initialStep = searchParams.get("step") as Step | null;
  const [step, setStep] = useState<Step>(initialStep || "select");
  const [draftId, setDraftId] = useState<string | null>(initialDraftId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialDraftId) setDraftId(initialDraftId);
    if (initialStep && steps.includes(initialStep)) setStep(initialStep);
    // eslint-disable-next-line
  }, []);

  // Navigation handlers
  const goTo = (s: Step) => setStep(s);
  const handleNext = () => {
    const idx = steps.indexOf(step);
    if (idx < steps.length - 1) setStep(steps[idx + 1]);
  };
  const handleBack = () => {
    const idx = steps.indexOf(step);
    if (idx > 0) setStep(steps[idx - 1]);
  };

  // Handler for when a template is selected and draft is created
  const handleTemplateSelected = async (newDraftId: string) => {
    setDraftId(newDraftId);
    setStep("customize");
  };

  // Handler for saving draft (can be passed to tabs)
  const handleSaveDraft = () => {
    // Optionally show a toast or feedback
  };
  const handleContinue = () => {
    setStep('preview');
  };

  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full flex-col items-start">
        <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-6 py-6">
          <div className="flex flex-col items-start gap-2">
            <span className="text-heading-1 font-heading-1 text-default-font">
              Create Release Note
            </span>
            <span className="text-body font-body text-subtext-color">
              {stepLabels[steps.indexOf(step)].label}
            </span>
          </div>
        </div>
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-8 bg-default-background px-6 py-12">
          <div className="flex w-full max-w-[1024px] flex-col items-start gap-8">
            <Tabs>
              {stepLabels.map((tab, i) => (
                <Tabs.Item
                  key={tab.label}
                  icon={tab.icon}
                  active={step === steps[i]}
                  onClick={() => setStep(steps[i])}
                  style={{ cursor: "pointer" }}
                >
                  {tab.label}
                </Tabs.Item>
              ))}
            </Tabs>
            {error && <div className="text-red-500 text-sm">{error}</div>}
            {/* Step content */}
            {step === "select" && (
              <SelectTemplateTab
                // When a template is selected and draft is created, call handleTemplateSelected
                onTemplateSelected={handleTemplateSelected}
              />
            )}
            {step === "customize" && (
              draftId ? (
                <CustomizeTab
                  draftId={draftId}
                  onBack={handleBack}
                  onSaveDraft={handleSaveDraft}
                  onContinue={handleContinue}
                />
              ) : (
                <div className="w-full text-center text-neutral-500 py-12">
                  Please select a template to start customizing your release note.
                </div>
              )
            )}
            {step === "preview" && (
              draftId ? (
                <PreviewTab
                  draftId={draftId}
                  onBack={handleBack}
                  onContinue={handleNext}
                  onSaveDraft={handleSaveDraft}
                />
              ) : (
                <div className="w-full text-center text-neutral-500 py-12">
                  Please select a template and customize your release note before previewing.
                </div>
              )
            )}
            {step === "publish" && (
              draftId ? (
                <PublishTab
                  draftId={draftId}
                  onBack={handleBack}
                  onSaveDraft={handleSaveDraft}
                />
              ) : (
                <div className="w-full text-center text-neutral-500 py-12">
                  Please complete the previous steps before publishing your release note.
                </div>
              )
            )}
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
};

const TemplateFlowPage: React.FC = () => {
  return (
    <Suspense fallback={
      <DefaultPageLayout>
        <div className="flex h-full w-full items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto mb-4"></div>
            <p className="text-neutral-600">Loading template flow...</p>
          </div>
        </div>
      </DefaultPageLayout>
    }>
      <TemplateFlowPageContent />
    </Suspense>
  );
};

export default TemplateFlowPage; 