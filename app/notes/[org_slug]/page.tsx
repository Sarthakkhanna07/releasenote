import { createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { notFound } from 'next/navigation'
import { Database } from '@/types/supabase'
import { EnhancedReleaseNotesList } from '@/components/public/enhanced-release-notes-list'

type Props = {
  params: { org_slug: string }
}

async function getOrganizationReleaseNotes(orgSlug: string) {
  const supabase = createServerComponentClient<Database>({ cookies })

  // Fetch the organization with branding info and custom CSS
  const { data: orgData, error: orgError } = await supabase
    .from('organizations')
    .select(`
      id, 
      name, 
      description,
      meta_title,
      meta_description,
      meta_image_url,
      favicon_url,
      brand_color,
      custom_domain,
      domain_verified,
      custom_css,
      custom_css_enabled
    `)
    .eq('slug', orgSlug)
    .single()

  if (orgError || !orgData) {
    return null
  }

  // Fetch published and public release notes with enhanced fields
  const { data: notesData, error: notesError } = await supabase
    .from('release_notes')
    .select('id, title, slug, published_at, content_html, category, tags, featured_image_url, excerpt, views')
    .eq('organization_id', orgData.id)
    .eq('status', 'published')
    .eq('is_public', true)
    .order('published_at', { ascending: false })
    .limit(50)

  if (notesError) {
    console.error('Error fetching release notes:', notesError)
    return null
  }

  return {
    organization: orgData,
    releaseNotes: notesData || []
  }
}

export async function generateMetadata({ params }: Props) {
  const data = await getOrganizationReleaseNotes(params.org_slug)

  if (!data) {
    return {
      title: 'Not Found'
    }
  }

  const { organization } = data
  const title = organization.meta_title || `${organization.name} - Release Notes`
  const description = organization.meta_description || organization.description || `Latest release notes from ${organization.name}`
  const imageUrl = organization.meta_image_url

  const metadata: any = {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      siteName: organization.name,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }

  // Add favicon if provided, else fallback to default
  metadata.icons = {
    icon: organization.favicon_url || '/branding/favicon-placeholder.ico',
    shortcut: organization.favicon_url || '/branding/favicon-placeholder.ico',
  }

  // Add social media image if provided
  if (imageUrl) {
    metadata.openGraph.images = [
      {
        url: imageUrl,
        width: 1200,
        height: 630,
        alt: title,
      }
    ]
    metadata.twitter.images = [imageUrl]
  }

  return metadata
}

export default async function OrganizationReleaseNotesPage({ params }: Props) {
  const data = await getOrganizationReleaseNotes(params.org_slug)

  if (!data) {
    notFound()
  }

  const { organization, releaseNotes } = data

  return (
    <EnhancedReleaseNotesList
      organization={organization}
      releaseNotes={releaseNotes}
      orgSlug={params.org_slug}
    />
  )
}