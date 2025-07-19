"use client";

import React from "react";
import Link from "next/link";
import { ModernNavbar } from "@/subframe-ui/components/ModernNavbar";
import { ModernNavbarMobile } from "@/subframe-ui/components/ModernNavbarMobile";
import { Button } from "@/subframe-ui/components/Button";
import { IconWithBackground } from "@/subframe-ui/components/IconWithBackground";
import { FeatherBrain, FeatherLayers, FeatherZap, FeatherCode, FeatherTrendingUp, FeatherPieChart, FeatherHelpCircle } from "@subframe/core";

function ReleaseNoteLanding() {
  return (
    <div className="flex h-full w-full flex-col items-center bg-default-background">
      <div className="flex w-full flex-col items-center justify-center gap-2 px-6 py-6">
        <ModernNavbar className="mobile:hidden" />
        <ModernNavbarMobile className="hidden mobile:flex" />
      </div>
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-center justify-center gap-2 px-6 py-24">
        <div className="flex w-full max-w-[576px] flex-col items-center justify-center gap-4">
          <span className="font-['Inter'] text-[48px] font-[600] leading-[58px] text-default-font text-center -tracking-[0.04em]">
            AI-powered release notes
          </span>
          <span className="font-['Inter'] text-[20px] font-[400] leading-[30px] text-subtext-color text-center">
            Transform your Git commits and tickets into professional release
            notes in seconds
          </span>
          <Link href="/signup" passHref legacyBehavior>
            <Button size="large" as="a">
              Try Free Today
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex w-full flex-col items-center px-6 py-24">
        <img
          className="h-144 w-full max-w-[768px] flex-none rounded-lg object-cover shadow-lg"
          src="https://images.unsplash.com/photo-1618477388954-7852f32655ec?w=800"
        />
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-12 px-6 py-24 bg-gradient-to-b from-transparent via-neutral-100 to-transparent">
        <div className="flex w-full max-w-[1024px] flex-col items-center justify-center gap-12">
          <span className="font-['Inter'] text-[32px] font-[600] leading-[40px] text-default-font text-center -tracking-[0.03em]">
            Simple. Smart. Effective.
          </span>
          <div className="flex w-full flex-wrap items-start gap-6">
            <div className="flex min-w-[320px] grow shrink-0 basis-0 flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherBrain />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                AI-Powered Generation
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Our AI analyzes your commits and tickets to create professional
                release notes automatically.
              </span>
            </div>
            <div className="flex min-w-[320px] grow shrink-0 basis-0 flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherLayers />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                Multiple Input Sources
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Connect GitHub, Jira, Linear, or paste your own content for
                maximum flexibility.
              </span>
            </div>
            <div className="flex min-w-[320px] grow shrink-0 basis-0 flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherZap />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                Instant Publishing
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Generate, edit, and publish release notes in minutes, not hours.
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-12 bg-white px-6 py-24">
        <div className="flex w-full max-w-[1024px] flex-col items-center justify-center gap-12">
          <span className="font-['Inter'] text-[32px] font-[600] leading-[40px] text-default-font text-center -tracking-[0.03em]">
            Tailored for Every Audience
          </span>
          <div className="w-full items-start gap-6 grid grid-cols-2">
            <div className="flex flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherCode />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                Engineer
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Technical changelog with detailed implementation notes and API
                changes.
              </span>
            </div>
            <div className="flex flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherTrendingUp />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                Marketing
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Blog-style summary highlighting key features and business
                benefits.
              </span>
            </div>
            <div className="flex flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherPieChart />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                C-Level
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Executive brief focusing on business impact and strategic value.
              </span>
            </div>
            <div className="flex flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <IconWithBackground size="medium" icon={<FeatherHelpCircle />} />
              <span className="font-['Inter'] text-[20px] font-[600] leading-[28px] text-default-font">
                Support Team
              </span>
              <span className="font-['Inter'] text-[16px] font-[400] leading-[24px] text-subtext-color">
                Customer-focused notes with troubleshooting and feature
                guidance.
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-12 bg-neutral-50 px-6 py-24">
        <div className="flex w-full max-w-[1024px] flex-col items-center justify-center gap-12">
          <span className="font-['Inter'] text-[32px] font-[600] leading-[40px] text-default-font text-center -tracking-[0.03em]">
            Trusted by Leading Teams
          </span>
          <div className="flex w-full items-center justify-center gap-12">
            <img
              className="h-8 flex-none object-cover grayscale opacity-80"
              src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=128"
            />
            <img
              className="h-8 flex-none object-cover grayscale opacity-80"
              src="https://images.unsplash.com/photo-1611162616305-c69b3037f72d?w=128"
            />
            <img
              className="h-8 flex-none object-cover grayscale opacity-80"
              src="https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?w=128"
            />
          </div>
          <div className="w-full items-start gap-8 grid grid-cols-2">
            <div className="flex flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <span className="font-['Inter'] text-[18px] font-[400] leading-[28px] text-subtext-color italic">
                ReleaseNoteAI has transformed how we communicate updates. The
                persona-based outputs are a game-changer for our
                cross-functional teams.
              </span>
              <div className="flex items-center gap-4">
                <img
                  className="h-12 w-12 flex-none rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=48"
                />
                <div className="flex flex-col items-start">
                  <span className="font-['Inter'] text-[16px] font-[600] leading-[24px] text-default-font">
                    Sarah Chen
                  </span>
                  <span className="font-['Inter'] text-[14px] font-[400] leading-[20px] text-neutral-400">
                    Product Manager at TechCorp
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-start gap-4 rounded-lg border border-solid border-neutral-200 bg-white px-8 py-8">
              <span className="font-['Inter'] text-[18px] font-[400] leading-[28px] text-subtext-color italic">
                The automated release notes save us hours of work each sprint.
                The technical accuracy is impressive.
              </span>
              <div className="flex items-center gap-4">
                <img
                  className="h-12 w-12 flex-none rounded-full object-cover"
                  src="https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=48"
                />
                <div className="flex flex-col items-start">
                  <span className="font-['Inter'] text-[16px] font-[600] leading-[24px] text-default-font">
                    Michael Torres
                  </span>
                  <span className="font-['Inter'] text-[14px] font-[400] leading-[20px] text-neutral-400">
                    Engineering Lead at CloudScale
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="flex w-full flex-wrap items-center justify-center gap-12">
            <div className="flex min-w-[160px] flex-col items-center gap-2">
              <span className="font-['Inter'] text-[24px] font-[600] leading-[32px] text-brand-600">
                10,000+
              </span>
              <span className="font-['Inter'] text-[14px] font-[400] leading-[20px] text-neutral-400">
                Release Notes Generated
              </span>
            </div>
            <div className="flex min-w-[160px] flex-col items-center gap-2">
              <span className="font-['Inter'] text-[24px] font-[600] leading-[32px] text-brand-600">
                500+
              </span>
              <span className="font-['Inter'] text-[14px] font-[400] leading-[20px] text-neutral-400">
                Development Teams
              </span>
            </div>
            <div className="flex min-w-[160px] flex-col items-center gap-2">
              <span className="font-['Inter'] text-[24px] font-[600] leading-[32px] text-brand-600">
                99.9%
              </span>
              <span className="font-['Inter'] text-[14px] font-[400] leading-[20px] text-neutral-400">
                Uptime
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="flex w-full flex-col items-center justify-center gap-6 border-t border-solid border-neutral-100 px-6 py-12">
        <div className="flex w-full max-w-[1024px] items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              className="h-6 w-6 flex-none object-cover"
              src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=24"
            />
            <span className="font-['Inter'] text-[14px] font-[400] leading-[20px] text-neutral-400">
              © 2025 ReleaseNoteAI. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="font-['Inter'] text-[14px] font-[500] leading-[20px] text-subtext-color">Dashboard</Link>
            <Link href="/signup" className="font-['Inter'] text-[14px] font-[500] leading-[20px] text-subtext-color">Sign Up</Link>
            <Link href="/login" className="font-['Inter'] text-[14px] font-[500] leading-[20px] text-subtext-color">Login</Link>
            <Link href="/docs" className="font-['Inter'] text-[14px] font-[500] leading-[20px] text-subtext-color">Documentation</Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReleaseNoteLanding; 