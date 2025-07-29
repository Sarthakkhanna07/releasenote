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
            <span className="text-3xl font-bold text-default-font">
              Release Notes Creator
            </span>
            <span className="text-base text-neutral-500">
              Choose your path to creating compelling release notes
            </span>
          </div>
        </div>
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-16 bg-default-background px-6 py-16">
          <div className="flex w-full max-w-[1024px] flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-2xl font-bold text-brand-600">
                Every great product deserves great release notes
              </span>
              <span className="text-lg text-neutral-500">
                Choose your preferred way to craft the perfect release notes
              </span>
            </div>
            <Alert
              variant="brand"
              icon={<FeatherZap />}
              title={<span className="text-lg font-semibold">Start Your Release Notes Journey</span>}
              description={<span className="text-base text-neutral-600">Choose between AI-powered generation or manual creation. Both options give you access to templates and full customization.</span>}
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
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6 hover:shadow-lg transition-shadow">
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
                      <span className="text-xl font-bold text-default-font">
                        Create with AI
                      </span>
                      <span className="text-base text-neutral-500">
                        Analyze your repository data and generate professional release notes automatically with AI
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
                        Smart Analysis
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-600"></div>
                        <span>Analyze commits & issues</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-600"></div>
                        <span>Smart template selection</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-brand-600"></div>
                        <span>Organization context</span>
                      </div>
                    </div>
                  </div>
                  <Link href="/dashboard/releases/new/ai" passHref legacyBehavior>
                    <Button icon={<FeatherArrowRight />} className="w-full">Start with AI</Button>
                  </Link>
                </div>
                {/* Manual Option */}
                <div className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6 hover:shadow-lg transition-shadow">
                  <div className="flex w-full flex-col items-start gap-4">
                    <IconWithBackground
                      variant="neutral"
                      size="large"
                      icon={<FeatherEdit2 />}
                      square={true}
                    />
                    <div className="flex w-full flex-col items-start gap-2">
                      <span className="text-xl font-bold text-default-font">
                        Start from Scratch
                      </span>
                      <span className="text-base text-neutral-500">
                        Create release notes manually with our premium editor and templates
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
                        Full Control
                      </Badge>
                    </div>
                    <div className="text-sm text-neutral-600 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
                        <span>Rich text editor</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
                        <span>Template library</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
                        <span>Full customization</span>
                      </div>
                    </div>
                  </div>
                  <Link href="/dashboard/releases/new/scratch" passHref legacyBehavior>
                    <Button variant="neutral-primary" icon={<FeatherArrowRight />} className="w-full">Start from Scratch</Button>
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