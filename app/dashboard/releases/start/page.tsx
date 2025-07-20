"use client";

import React from "react";
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout";
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton";
import { FeatherX } from "@subframe/core";
import { Alert } from "@/components/subframe-ui/ui/components/Alert";
import { FeatherZap } from "@subframe/core";
import { IconWithBackground } from "@/components/subframe-ui/ui/components/IconWithBackground";
import { Badge } from "@/components/subframe-ui/ui/components/Badge";
import { FeatherClock } from "@subframe/core";
import { FeatherGitPullRequest } from "@subframe/core";
import { Button } from "@/components/subframe-ui/ui/components/Button";
import { FeatherArrowRight } from "@subframe/core";
import { FeatherFileText } from "@subframe/core";
import { FeatherLayout } from "@subframe/core";
import { FeatherCopy } from "@subframe/core";
import { FeatherCheck } from "@subframe/core";
import { FeatherEdit2 } from "@subframe/core";
import { FeatherFeather } from "@subframe/core";
import { FeatherMaximize } from "@subframe/core";
import { FeatherPenTool } from "@subframe/core";
import Link from "next/link";

export default function ReleaseJourneyStart() {
  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full flex-col items-start">
        <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-6 py-6">
          <div className="flex flex-col items-start gap-2">
            <span className="text-heading-1 font-heading-1 text-default-font">
              Release Notes Creator
            </span>
            <span className="text-body font-body text-subtext-color">
              Choose your path to creating compelling release notes
            </span>
          </div>
        </div>
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-16 bg-default-background px-6 py-16">
          <div className="flex w-full max-w-[1024px] flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-heading-1 font-heading-1 text-brand-600">
                Every great product deserves great release notes
              </span>
              <span className="text-heading-3 font-heading-3 text-neutral-500">
                Choose your preferred way to craft the perfect release notes
              </span>
            </div>
            <Alert
              variant="brand"
              icon={<FeatherZap />}
              title="Start Your Release Notes Journey"
              description="Whether you prefer AI assistance, proven templates, or starting from scratch, we've got you covered. Select the path that best matches your style."
              actions={
                <IconButton
                  size="medium"
                  icon={<FeatherX />}
                  onClick={() => {}}
                />
              }
            />
            <div className="flex w-full flex-col items-start gap-8">
              <div className="flex w-full items-start gap-6">
                {/* AI Option */}
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start justify-between">
                      <IconWithBackground
                        size="large"
                        icon={<FeatherZap />}
                        square={true}
                      />
                      <Badge>Recommended</Badge>
                    </div>
                    <div className="flex w-full flex-col items-start gap-2">
                      <span className="text-heading-2 font-heading-2 text-default-font">
                        Create with AI
                      </span>
                      <span className="text-body-bold font-body-bold text-subtext-color">
                        Let our AI assistant transform your changes into
                        polished release notes automatically
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" icon={<FeatherClock />}>
                        Fastest
                      </Badge>
                      <Badge variant="neutral" icon={<FeatherZap />}>
                        AI-Powered
                      </Badge>
                      <Badge variant="neutral" icon={<FeatherGitPullRequest />}>
                        Integration
                      </Badge>
                    </div>
                  </div>
                  <Link href="/dashboard/releases/new/ai" passHref legacyBehavior>
                    <Button icon={<FeatherArrowRight />}>Start with AI</Button>
                  </Link>
                </div>
                {/* Template Option */}
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
                  <div className="flex w-full flex-col items-start gap-4">
                    <IconWithBackground
                      variant="neutral"
                      size="large"
                      icon={<FeatherFileText />}
                      square={true}
                    />
                    <div className="flex w-full flex-col items-start gap-2">
                      <span className="text-heading-2 font-heading-2 text-default-font">
                        Use Template
                      </span>
                      <span className="text-body-bold font-body-bold text-subtext-color">
                        Start with a proven structure and customize it to your
                        needs
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" icon={<FeatherLayout />}>
                        Structured
                      </Badge>
                      <Badge variant="neutral" icon={<FeatherCopy />}>
                        Consistent
                      </Badge>
                      <Badge variant="neutral" icon={<FeatherCheck />}>
                        Best Practice
                      </Badge>
                    </div>
                  </div>
                  <Link href="/dashboard/releases/new/template" passHref legacyBehavior>
                    <Button variant="neutral-primary" icon={<FeatherArrowRight />}>Choose template</Button>
                  </Link>
                </div>
                {/* Scratch Option */}
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
                  <div className="flex w-full flex-col items-start gap-4">
                    <IconWithBackground
                      variant="neutral"
                      size="large"
                      icon={<FeatherEdit2 />}
                      square={true}
                    />
                    <div className="flex w-full flex-col items-start gap-2">
                      <span className="text-heading-2 font-heading-2 text-default-font">
                        Start Fresh
                      </span>
                      <span className="text-body-bold font-body-bold text-subtext-color">
                        Begin with a blank canvas and craft your perfect release
                        notes
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="neutral" icon={<FeatherFeather />}>
                        Creative
                      </Badge>
                      <Badge variant="neutral" icon={<FeatherMaximize />}>
                        Flexible
                      </Badge>
                      <Badge variant="neutral" icon={<FeatherPenTool />}>
                        Custom
                      </Badge>
                    </div>
                  </div>
                  <Link href="/dashboard/releases/new/scratch" passHref legacyBehavior>
                    <Button variant="neutral-primary" icon={<FeatherArrowRight />}>Start from scratch</Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DefaultPageLayout>
  );
} 