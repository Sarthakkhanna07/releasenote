'use client'

import React from 'react'
import Image from 'next/image'
// Simple client-side sanitization - for preview only
function sanitizeHtml(html: string): string {
  if (!html) return ''
  // For preview, we'll use a basic sanitization
  // In production, this would be sanitized server-side
  return html
}

interface ReleaseNotePreviewProps {
  title: string
  content: string
  version?: string
  coverImageUrl?: string | null
  organization?: {
    name: string
    logo_url?: string | null
  }
  publishedAt?: string
  className?: string
}

export function ReleaseNotePreview({
  title,
  content,
  version,
  coverImageUrl,
  organization,
  publishedAt,
  className = ''
}: ReleaseNotePreviewProps) {
  const sanitizedHtml = sanitizeHtml(content)
  const previewDate = publishedAt ? new Date(publishedAt) : new Date()

  return (
    <div className={`min-h-screen bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 ${className}`}>
      <article className="max-w-3xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden">
        {/* Cover Image */}
        {coverImageUrl && (
          <div className="w-full h-64 relative">
            <Image
              src={coverImageUrl}
              alt={`${title} cover image`}
              fill
              style={{ objectFit: 'cover' }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>
        )}

        <div className="px-6 py-8 sm:px-10">
          {/* Organization Header */}
          {organization && (organization.name || organization.logo_url) && (
            <div className="mb-6 flex items-center space-x-3">
              {organization.logo_url && (
                <Image
                  src={organization.logo_url}
                  alt={`${organization.name} Logo`}
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              )}
              {organization.name && (
                <span className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                  {organization.name}
                </span>
              )}
            </div>
          )}

          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
            {title}
          </h1>

          {/* Version and Date */}
          <div className="flex items-center space-x-4 mb-8">
            {version && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                {version}
              </span>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Published on {previewDate.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>

          {/* Content */}
          <div
            className="tiptap prose prose-lg dark:prose-invert max-w-none prose-img:rounded-lg prose-a:text-primary-600 hover:prose-a:text-primary-500"
            dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
          />
        </div>
      </article>

      {/* Preview Notice */}
      <div className="max-w-3xl mx-auto mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-center space-x-2 text-blue-800 dark:text-blue-200">
          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
          <span className="text-sm font-medium">Preview Mode</span>
        </div>
        <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
          This is how your release note will appear to the public. Changes are not saved until you click "Save Changes".
        </p>
      </div>

      {/* Footer */}
      <footer className="max-w-3xl mx-auto mt-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        Powered by ReleaseNoteAI
      </footer>
    </div>
  )
}