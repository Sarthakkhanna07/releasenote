'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { SearchFilter } from './search-filter'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { CalendarIcon, EyeIcon, TagIcon } from 'lucide-react'

interface ReleaseNote {
  id: string
  title: string
  slug: string
  published_at: string
  content_html?: string
  category?: string
  tags?: string[]
  featured_image_url?: string
  excerpt?: string
  views?: number
}

interface Organization {
  name: string
  description?: string
  logo_url?: string
  brand_color?: string
  custom_css?: string
  custom_css_enabled?: boolean
}

interface EnhancedReleaseNotesListProps {
  organization: Organization
  releaseNotes: ReleaseNote[]
  orgSlug: string
}

export function EnhancedReleaseNotesList({
  organization,
  releaseNotes,
  orgSlug
}: EnhancedReleaseNotesListProps) {
  const [filteredNotes, setFilteredNotes] = useState<ReleaseNote[]>(releaseNotes)

  const brandColor = organization.brand_color || '#7F56D9'

  const extractTextPreview = (html: string, maxLength: number = 160): string => {
    if (!html) return ''
    const text = html.replace(/<[^>]*>/g, '').trim()
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength).trim() + '...'
  }

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getCategoryColor = (category: string): string => {
    // Generate consistent colors for categories
    const colors = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-indigo-100 text-indigo-800'
    ]

    const hash = category.split('').reduce((a, b) => {
      a = ((a << 5) - a) + b.charCodeAt(0)
      return a & a
    }, 0)

    return colors[Math.abs(hash) % colors.length]
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-6 sm:py-8 md:py-12 px-4 sm:px-6 lg:px-8 release-notes-container">
      {/* Inject Custom CSS if enabled */}
      {organization.custom_css_enabled && organization.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: organization.custom_css }} />
      )}
      <div className="max-w-6xl mx-auto">
        {/* Organization Header */}
        <header className="text-center mb-8 sm:mb-10 md:mb-12">
          <div className="flex justify-center mb-4 sm:mb-6">
            <Image
              src={organization.logo_url || '/branding/org-logo-placeholder.svg'}
              alt={`${organization.name} logo`}
              width={60}
              height={60}
              className="rounded-full sm:w-20 sm:h-20 bg-gray-200 dark:bg-gray-700 object-cover"
            />
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 px-2">
            {organization.name}
          </h1>

          {organization.description && (
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed px-4">
              {organization.description}
            </p>
          )}
        </header>



        {/* Search and Filters - Mobile Optimized */}
        <div className="mb-6 md:mb-8 px-2 sm:px-0">
          <SearchFilter
            releaseNotes={releaseNotes}
            onFilter={setFilteredNotes}
            brandColor={brandColor}
          />
        </div>

        {/* Release Notes Grid - Mobile Optimized */}
        {filteredNotes.length === 0 ? (
          <div className="text-center py-12 px-4">
            <div className="mb-4">
              <CalendarIcon className="w-12 h-12 md:w-16 md:h-16 text-gray-300 mx-auto" />
            </div>
            <h3 className="text-lg md:text-xl font-semibold text-gray-500 dark:text-gray-400 mb-2">
              No release notes found
            </h3>
            <p className="text-sm md:text-base text-gray-400 dark:text-gray-500 max-w-sm mx-auto">
              {releaseNotes.length === 0
                ? `${organization.name} hasn't published any release notes yet.`
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-2">
            {filteredNotes.map((note) => (
              <Card
                key={note.id}
                className="bg-white dark:bg-gray-800 shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden group release-note-card mx-2 sm:mx-0"
              >
                <CardContent className="p-0">
                  <article className="h-full flex flex-col">
                    {/* Featured Image */}
                    {note.featured_image_url && (
                      <div className="relative h-40 sm:h-48 overflow-hidden">
                        <Image
                          src={note.featured_image_url}
                          alt={`${note.title} featured image`}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-300"
                          sizes="(max-width: 640px) 100vw, (max-width: 768px) 100vw, 50vw"
                        />
                      </div>
                    )}

                    <div className="p-4 sm:p-6 flex-1 flex flex-col">
                      {/* Category and Tags */}
                      <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3">
                        {note.category && (
                          <Badge
                            variant="secondary"
                            className={`text-xs ${getCategoryColor(note.category)}`}
                          >
                            {note.category}
                          </Badge>
                        )}

                        {note.tags && note.tags.slice(0, 2).map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="text-xs"
                          >
                            <TagIcon className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}

                        {note.tags && note.tags.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{note.tags.length - 2} more
                          </Badge>
                        )}
                      </div>

                      {/* Title */}
                      <h2 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white mb-3 line-clamp-2 group-hover:text-opacity-80 transition-colors release-note-title leading-tight">
                        <Link
                          href={`/notes/${orgSlug}/${note.slug}`}
                          className="transition-colors hover:opacity-80 touch-none"
                          style={{ color: 'var(--brand-color)' }}
                        >
                          {note.title}
                        </Link>
                      </h2>

                      {/* Excerpt */}
                      <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 flex-1 line-clamp-3 release-note-content leading-relaxed">
                        {note.excerpt || extractTextPreview(note.content_html || '')}
                      </p>

                      {/* Meta Information */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 text-xs sm:text-sm text-gray-500 dark:text-gray-400 pt-3 sm:pt-4 border-t border-gray-100 dark:border-gray-700 release-note-meta">
                        <div className="flex items-center gap-3 sm:gap-4">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                            <span className="truncate">{formatDate(note.published_at)}</span>
                          </div>

                          {note.views && note.views > 0 && (
                            <div className="flex items-center gap-1">
                              <EyeIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                              <span>{note.views.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        <Link
                          href={`/notes/${orgSlug}/${note.slug}`}
                          className="font-medium transition-colors hover:opacity-80 touch-none text-left sm:text-right"
                          style={{ color: 'var(--brand-color)' }}
                        >
                          Read more →
                        </Link>
                      </div>
                    </div>
                  </article>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Load More / Pagination Placeholder */}
        {filteredNotes.length > 0 && filteredNotes.length === releaseNotes.length && releaseNotes.length >= 50 && (
          <div className="text-center mt-8 sm:mt-12 px-4">
            <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400">
              Showing latest 50 release notes
            </p>
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 sm:mt-20 text-center text-gray-500 dark:text-gray-400 text-xs sm:text-sm border-t border-gray-200 dark:border-gray-700 pt-6 sm:pt-8 px-4">
          <p>Powered by <span className="font-medium">ReleaseNoteAI</span></p>
        </footer>
      </div>
    </div>
  )
}