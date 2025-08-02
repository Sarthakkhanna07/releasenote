/**
 * Organization Profile Page
 * 
 * This page allows users to configure their organization details
 * that will be used by the professional AI prompt system
 */

"use client";

import React, { useState, useEffect } from "react";
import { FeatherBuilding, FeatherX, FeatherSave } from "@subframe/core";
import { Button, IconButton, Alert, TextField } from "@/components/subframe-ui/ui";
import { toast } from "sonner";

interface OrganizationProfile {
  id: string;
  name: string;
  slug: string;
  description?: string;
  meta_description?: string;
  brand_color?: string;
  plan?: string;
  settings: {
    industry?: string;
    company_size?: string;
    product_type?: string;
    target_market?: string;
    company_description?: string;
  };
}

export default function OrganizationProfilePage() {
  const [profile, setProfile] = useState<OrganizationProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/organization/profile");
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Failed to fetch organization profile");

        // The API returns data.organization
        const organization = json.data?.organization || json.organization;
        setProfile(organization);
      } catch (err: any) {
        setError(err.message || "Failed to fetch organization profile");
        toast.error(err.message || "Failed to fetch organization profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const handleChange = (field: string, value: string) => {
    if (!profile) return;

    if (field.startsWith('settings.')) {
      const settingsField = field.replace('settings.', '');
      setProfile({
        ...profile,
        settings: {
          ...profile.settings,
          [settingsField]: value
        }
      });
    } else {
      setProfile({ ...profile, [field]: value });
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/organization/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save organization profile");

      // The API returns data.organization
      const organization = json.data?.organization || json.organization;
      setProfile(organization);
      toast.success("Organization profile saved successfully");
    } catch (err: any) {
      setError(err.message || "Failed to save organization profile");
      toast.error(err.message || "Failed to save organization profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <span>Loading organization profile...</span>
      </div>
    );
  }



  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center">
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
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col items-start bg-default-background">
      <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-16 bg-default-background px-6 py-16">
        <div className="flex w-full max-w-[1024px] flex-col items-start gap-16">
          <div className="flex w-full flex-col items-start gap-4">
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-col items-start gap-2">
                <div className="flex items-center gap-3">
                  <FeatherBuilding className="w-6 h-6 text-brand-600" />
                  <span className="text-2xl font-semibold text-default-font">
                    Organization Profile
                  </span>
                </div>
                <span className="text-sm text-neutral-500">
                  Configure your organization details for AI-powered content generation
                </span>
              </div>
              <Button
                onClick={handleSave}
                disabled={saving}
                icon={<FeatherSave />}
              >
                {saving ? "Saving..." : "Save Profile"}
              </Button>
            </div>

            <Alert
              variant="brand"
              title="AI Context Enhancement"
              description="These details help our AI system create more accurate, context-aware content that reflects your organization's industry, size, and target market."
              actions={
                <IconButton
                  size="medium"
                  icon={<FeatherX />}
                  onClick={() => setError(null)}
                />
              }
            />
          </div>

          <div className="flex w-full flex-col items-start gap-16">
            {/* Basic Information */}
            <div className="flex w-full flex-col items-start gap-8">
              <div className="flex w-full items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-xl font-semibold text-default-font">
                  Basic Information
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-default-font">
                    Organization Name
                  </label>
                  <input
                    type="text"
                    value={profile?.name || ""}
                    disabled
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                  />
                  <p className="text-xs text-neutral-500">Set during onboarding (read-only)</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-default-font">
                    Organization Slug
                  </label>
                  <input
                    type="text"
                    value={profile?.slug || ""}
                    disabled
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md bg-gray-50 text-gray-600 text-sm"
                  />
                  <p className="text-xs text-neutral-500">URL-friendly identifier (read-only)</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <label className="text-sm font-medium text-default-font">
                  Company Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm text-default-font bg-white min-h-[100px] resize-vertical"
                  value={profile?.description || ""}
                  onChange={(e) => handleChange("description", e.target.value)}
                  placeholder="Leading B2B SaaS platform for enterprise productivity and collaboration"
                />
                <p className="text-xs text-neutral-500">Brief overview of your company for public pages and AI context</p>
              </div>
            </div>

            {/* Company Details */}
            <div className="flex w-full flex-col items-start gap-8">
              <div className="flex w-full items-center justify-between pb-3 border-b border-neutral-200">
                <span className="text-xl font-semibold text-default-font">
                  Company Details
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-default-font">
                    Industry
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                    value={profile?.settings?.industry || ""}
                    onChange={(e) => handleChange("settings.industry", e.target.value)}
                  >
                    <option value="">Select Industry</option>
                    <option value="SaaS">SaaS / Software</option>
                    <option value="E-commerce">E-commerce</option>
                    <option value="FinTech">FinTech / Financial Services</option>
                    <option value="HealthTech">HealthTech / Healthcare</option>
                    <option value="EdTech">EdTech / Education</option>
                    <option value="Gaming">Gaming / Entertainment</option>
                    <option value="Manufacturing">Manufacturing</option>
                    <option value="Consulting">Consulting / Services</option>
                    <option value="Non-profit">Non-profit</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-xs text-neutral-500">Your primary industry or sector</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-default-font">
                    Company Size
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                    value={profile?.settings?.company_size || ""}
                    onChange={(e) => handleChange("settings.company_size", e.target.value)}
                  >
                    <option value="">Select Company Size</option>
                    <option value="1-10 employees">1-10 employees (Startup)</option>
                    <option value="11-50 employees">11-50 employees (Small)</option>
                    <option value="51-200 employees">51-200 employees (Medium)</option>
                    <option value="201-1000 employees">201-1000 employees (Large)</option>
                    <option value="1000+ employees">1000+ employees (Enterprise)</option>
                  </select>
                  <p className="text-xs text-neutral-500">Number of employees in your organization</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-default-font">
                    Product Type
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                    value={profile?.settings?.product_type || ""}
                    onChange={(e) => handleChange("settings.product_type", e.target.value)}
                  >
                    <option value="">Select Product Type</option>
                    <option value="B2B SaaS">B2B SaaS Platform</option>
                    <option value="B2C App">B2C Mobile/Web App</option>
                    <option value="API/SDK">API / SDK</option>
                    <option value="Desktop Software">Desktop Software</option>
                    <option value="Hardware">Hardware Product</option>
                    <option value="Service">Service / Consulting</option>
                    <option value="Marketplace">Marketplace / Platform</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-xs text-neutral-500">Type of product or service you offer</p>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-default-font">
                    Target Market
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-gray-900 bg-white text-sm"
                    value={profile?.settings?.target_market || ""}
                    onChange={(e) => handleChange("settings.target_market", e.target.value)}
                  >
                    <option value="">Select Target Market</option>
                    <option value="Enterprise teams">Enterprise teams and organizations</option>
                    <option value="Small businesses">Small and medium businesses</option>
                    <option value="Developers">Developers and technical teams</option>
                    <option value="Consumers">Individual consumers</option>
                    <option value="Students and educators">Students and educators</option>
                    <option value="Healthcare">Healthcare professionals</option>
                    <option value="Government">Government and public sector</option>
                    <option value="Other">Other</option>
                  </select>
                  <p className="text-xs text-neutral-500">Primary target audience for your product</p>
                </div>
              </div>

              <div className="flex flex-col gap-2 w-full">
                <label className="text-sm font-medium text-default-font">
                  Detailed Company Description
                </label>
                <textarea
                  className="w-full px-3 py-2 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent text-sm text-default-font bg-white min-h-[120px] resize-vertical"
                  value={profile?.settings?.company_description || ""}
                  onChange={(e) => handleChange("settings.company_description", e.target.value)}
                  placeholder="We help enterprise teams collaborate more effectively with our suite of productivity tools. Our platform integrates with existing workflows and provides real-time insights for better decision making."
                />
                <p className="text-xs text-neutral-500">More detailed description of your company, mission, and value proposition (used for AI context)</p>
              </div>
            </div>

            {/* AI Impact Preview */}
            <div className="w-full p-6 bg-neutral-50 rounded-lg border border-neutral-200">
              <h4 className="text-xl font-semibold text-default-font mb-4">🎯 How This Improves Your AI Content</h4>
              <div className="space-y-3 text-sm text-neutral-600">
                <p><strong className="text-default-font">Industry Context:</strong> AI will understand your {profile?.settings?.industry || '[industry]'} space and use appropriate terminology</p>
                <p><strong className="text-default-font">Company Size:</strong> Content will be tailored for {profile?.settings?.company_size || '[company size]'} organizational needs</p>
                <p><strong className="text-default-font">Product Focus:</strong> Release notes will highlight features relevant to {profile?.settings?.product_type || '[product type]'} users</p>
                <p><strong className="text-default-font">Target Audience:</strong> Communication style will be optimized for {profile?.settings?.target_market || '[target market]'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}