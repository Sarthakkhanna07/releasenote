'use client'

import React, { useState } from 'react'
import { Button } from '@/components/subframe-ui/ui/components/Button'
import { Badge } from '@/components/subframe-ui/ui/components/Badge'
import { Tabs } from '@/components/subframe-ui/ui/components/Tabs'
import { FeatherExternalLink, FeatherEye, FeatherGlobe, FeatherLock } from '@subframe/core'
import { generatePublicUrl } from '@/lib/utils/public-url'

interface PublicPreviewProps {
  releaseNote: {
    id: string
    title: string
    slug: string
    content_html: string
    status: string
    is_public?: boolean
  }
  organization: {
    slug: string
    name: string
    logo_url?: string
    custom_domain?: string
  }
}

export function PublicPreview({ releaseNote, organization }: PublicPreviewProps) {
  const [activeTab, setActiveTab] = useState('preview')

  const publicUrl = generatePublicUrl({
    orgSlug: organization.slug,
    releaseSlug: releaseNote.slug,
    customDomain: organization.custom_domain
  })



  return (
    <div className="w-full rounded-xl border border-neutral-200 bg-white">
      <div className="px-6 py-4 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FeatherEye className="h-5 w-5 text-default-font" />
            <span className="text-lg font-semibold text-default-font">Public Preview</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={releaseNote.is_public ? 'success' : 'neutral'}>
              {releaseNote.is_public ? (
                <>
                  <FeatherGlobe className="h-3 w-3 mr-1" />
                  Public
                </>
              ) : (
                <>
                  <FeatherLock className="h-3 w-3 mr-1" />
                  Private
                </>
              )}
            </Badge>
          </div>
        </div>
      </div>
      <div className="p-6">
        <Tabs>
          <Tabs.Item 
            active={activeTab === 'preview'} 
            onClick={() => setActiveTab('preview')}
          >
            Preview
          </Tabs.Item>
          <Tabs.Item 
            active={activeTab === 'url'} 
            onClick={() => setActiveTab('url')}
          >
            Public URL
          </Tabs.Item>

        </Tabs>

        <div className="mt-6">
          {activeTab === 'preview' && (
            <div className="border border-neutral-200 rounded-lg overflow-hidden">
              <div className="bg-neutral-50 p-4 border-b border-neutral-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {organization.logo_url && (
                      <img 
                        src={organization.logo_url} 
                        alt={`${organization.name} logo`}
                        className="w-6 h-6 rounded"
                      />
                    )}
                    <span className="font-medium text-sm text-default-font">{organization.name}</span>
                  </div>
                  <span className="text-xs text-neutral-500">Public Preview</span>
                </div>
              </div>
              <div className="p-6">
                <h1 className="text-2xl font-bold mb-4 text-default-font">{releaseNote.title}</h1>
                <div 
                  className="tiptap prose prose-sm max-w-none text-default-font"
                  dangerouslySetInnerHTML={{ __html: releaseNote.content_html || '' }}
                />
              </div>
            </div>
          )}

          {activeTab === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block text-default-font">Public URL</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={publicUrl}
                    readOnly
                    className="flex-1 px-3 py-2 border border-neutral-200 rounded-md bg-neutral-50 text-sm text-default-font"
                  />
                  <Button
                    variant="neutral-secondary"
                    size="small"
                    onClick={() => window.open(publicUrl, '_blank')}
                  >
                    <FeatherExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div className="text-sm text-neutral-600">
                <p>This URL will be accessible to anyone on the internet when published.</p>
                {organization.custom_domain && (
                  <p className="mt-2">
                    <strong>Custom Domain:</strong> {organization.custom_domain}
                  </p>
                )}
              </div>
            </div>
          )}


        </div>
      </div>
    </div>
  )
} 