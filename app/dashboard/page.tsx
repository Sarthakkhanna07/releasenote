"use client";

import React from "react";
import { Button } from "@/subframe-ui/components/Button";
import { FeatherBell, FeatherSettings, FeatherFileText, FeatherArrowRight, FeatherLink } from "@subframe/core";
import { IconButton } from "@/subframe-ui/components/IconButton";
import { IconWithBackground } from "@/subframe-ui/components/IconWithBackground";
import Link from "next/link";

export default function DashboardHomePage() {
  return (
    <div className="px-8 py-0 w-full flex flex-col items-start gap-6">
      <div className="flex w-full items-center gap-2 border-b border-solid border-neutral-border pb-2 mb-1">
        <span className="grow shrink-0 basis-0 text-2xl font-semibold text-default-font">
          Dashboard
        </span>
        <Link href="/dashboard/notifications">
          <Button
            variant="neutral-tertiary"
            icon={<FeatherBell />}
            className="text-sm px-3 py-1"
          >
            Notifications
          </Button>
        </Link>
        <Link href="/dashboard/settings">
          <IconButton
            icon={<FeatherSettings />}
            className="w-8 h-8"
          />
        </Link>
      </div>
      <div className="flex flex-col items-start gap-1 mb-2">
        <span className="text-2xl font-bold text-default-font">
          Welcome to Release Notes Generator
        </span>
        <span className="text-base text-subtext-color">
          Ready to generate some awesome release notes?
        </span>
      </div>
      <div className="flex w-full flex-col items-start gap-4 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
        <span className="text-lg font-semibold text-default-font mb-2">
          Quick Actions
        </span>
        <div className="flex w-full flex-wrap items-start gap-14">
          <Link href="/dashboard/releases/new/ai">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Create Release Note
            </Button>
          </Link>
          <Link href="/dashboard/configuration">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Setup Integration
            </Button>
          </Link>
          <Link href="/dashboard/ai-context">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              AI Context Settings
            </Button>
          </Link>
          <Link href="/dashboard/templates">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Template Management
            </Button>
          </Link>
          <a href="mailto:help@releasenote.ai">
            <Button variant="neutral-secondary" size="large" className="px-6 py-3 min-w-[180px]">
              Support &amp; Help
            </Button>
          </a>
        </div>
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-lg font-semibold text-default-font mb-1">
          Recent Release Notes
        </span>
        <div className="flex w-full flex-col items-center gap-3 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-10">
          <IconWithBackground size="large" icon={<FeatherFileText />} />
          <span className="text-base text-subtext-color">
            No release notes created yet.
          </span>
          <Link href="/dashboard/releases/new/ai">
            <Button className="text-sm px-4 py-2">
              Create your first one
            </Button>
          </Link>
        </div>
        <Link href="/dashboard/releases">
          <Button
            variant="neutral-tertiary"
            iconRight={<FeatherArrowRight />}
            className="text-sm px-3 py-1 self-end"
          >
            View all release notes
          </Button>
        </Link>
      </div>
      <div className="flex w-full flex-col items-start gap-3">
        <span className="text-lg font-semibold text-default-font mb-1">
          Integrations Status
        </span>
        <div className="flex w-full flex-col items-center gap-3 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-10">
          <IconWithBackground size="large" icon={<FeatherLink />} />
          <span className="text-base text-subtext-color">
            No integrations connected yet.
          </span>
          <Link href="/dashboard/configuration">
            <Button className="text-sm px-4 py-2">
              Connect your first integration
            </Button>
          </Link>
        </div>
        <Link href="/dashboard/configuration">
          <Button
            variant="neutral-tertiary"
            iconRight={<FeatherArrowRight />}
            className="text-sm px-3 py-1 self-end"
          >
            Manage integrations
          </Button>
        </Link>
      </div>
      <div className="flex w-full flex-col items-start gap-3 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6">
        <span className="text-lg font-semibold text-default-font mb-1">
          Getting Started Checklist
        </span>
        <div className="flex w-full flex-col items-start gap-2">
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border py-3">
            <span className="text-base text-default-font">
              Connect an integration (Jira, GitHub, etc.)
            </span>
            <Link href="/dashboard/configuration">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Setup
              </Button>
            </Link>
          </div>
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border py-3">
            <span className="text-base text-default-font">
              Configure your AI Context
            </span>
            <Link href="/dashboard/ai-context">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Configure
              </Button>
            </Link>
          </div>
          <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border py-3">
            <span className="text-base text-default-font">
              Create your first Release Note
            </span>
            <Link href="/dashboard/releases/new/ai">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Create
              </Button>
            </Link>
          </div>
          <div className="flex w-full items-center justify-between py-3">
            <span className="text-base text-default-font">
              Explore and manage Templates
            </span>
            <Link href="/dashboard/templates">
              <Button variant="neutral-tertiary" className="text-sm px-3 py-1">
                Templates
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}