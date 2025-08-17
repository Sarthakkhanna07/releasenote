import { createClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { Database } from '@/types/supabase'
import { EnhancedReleaseNotesList } from '@/components/public/enhanced-release-notes-list'
import { PreviewModeWrapper } from '@/components/public/preview-mode-wrapper'
import { FaviconUpdater } from '@/components/public/favicon-updater'

type Props = {
  params: { org_slug: string }
  searchParams?: { [key: string]: string | string[] | undefined }
}

async function getOrganizationReleaseNotes(orgSlug: string) {
  // Create a public Supabase client (no authentication required for public pages)
  const supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Fetch the organization with branding info
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
      logo_url
    `)
    .eq('slug', orgSlug)
    .single()

  if (orgError || !orgData) {
    return null
  }

  // Fetch published and public release notes
  const { data: notesData, error: notesError } = await supabase
    .from('release_notes')
    .select('id, title, slug, published_at, content_html, views')
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
  const { org_slug } = await params
  const data = await getOrganizationReleaseNotes(org_slug)

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

  // Add comprehensive favicon support with cache busting
  const baseFaviconUrl = organization.favicon_url || '/branding/favicon-placeholder.ico'
  // Add cache busting parameter using organization ID and favicon URL hash
  const faviconHash = organization.favicon_url ? 
    organization.favicon_url.split('/').pop()?.split('?')[0] || 'default' : 
    'default'
  const faviconUrl = baseFaviconUrl.includes('?') 
    ? `${baseFaviconUrl}&v=${faviconHash}` 
    : `${baseFaviconUrl}?v=${faviconHash}`
    
  metadata.icons = {
    icon: [
      { url: faviconUrl, sizes: '16x16', type: 'image/x-icon' },
      { url: faviconUrl, sizes: '32x32', type: 'image/x-icon' },
      { url: faviconUrl, sizes: '48x48', type: 'image/x-icon' },
    ],
    shortcut: faviconUrl,
    apple: faviconUrl,
  }
  
  // Add additional favicon links for better browser support
  metadata.other = {
    'msapplication-TileColor': organization.brand_color || '#7F56D9',
    'theme-color': organization.brand_color || '#7F56D9',
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

export default async function OrganizationReleaseNotesPage({ params, searchParams }: Props) {
  const { org_slug } = await params
  const resolvedSearchParams = await searchParams

  const data = await getOrganizationReleaseNotes(org_slug)

  if (!data) {
    notFound()
  }

  const { organization, releaseNotes } = data!

  // Preview-only CSS injection via query params (no DB write, for admin preview UX)
  const previewBrand = typeof resolvedSearchParams?.preview_brand === 'string' ? resolvedSearchParams.preview_brand : undefined
  const previewCssEnabled = resolvedSearchParams?.preview_css_enabled === '1' || resolvedSearchParams?.preview_css_enabled === 'true'
  const previewCssRaw = typeof resolvedSearchParams?.preview_css === 'string' ? decodeURIComponent(resolvedSearchParams.preview_css) : ''
  const previewCssLarge = resolvedSearchParams?.preview_css_large === '1' // Signal that CSS will come via postMessage
  const previewCss = previewCssEnabled ? previewCssRaw : ''

  // Always inject brand color, use preview if available
  const effectiveBrandColor = previewBrand || organization.brand_color || '#7F56D9'

  // Sanitize CSS to prevent breaking the page
  const sanitizedPreviewCss = previewCss ? previewCss.replace(/javascript:/gi, '').replace(/<script/gi, '') : ''

  // Check if this is a preview request
  const isPreviewMode = previewBrand || previewCssEnabled || previewCssLarge

  return (
    <>
      {/* Base brand color styles - always consistent */}
      <style suppressHydrationWarning>
        {`:root { 
          --brand-color: ${effectiveBrandColor}; 
          --brand-color-hover: ${effectiveBrandColor}dd;
        }`}
      </style>

      {/* Dynamic favicon updater */}
      <FaviconUpdater 
        faviconUrl={organization.favicon_url} 
        organizationId={organization.id} 
      />

      {/* Handle preview mode with client-side rendering */}
      {isPreviewMode ? (
        <PreviewModeWrapper
          organization={organization}
          releaseNotes={releaseNotes}
          orgSlug={org_slug}
          previewCss={sanitizedPreviewCss}
          previewCssEnabled={previewCssEnabled}
          previewCssLarge={previewCssLarge}
        />
      ) : (
        /* Normal SSR for public users */
        <EnhancedReleaseNotesList
          organization={organization}
          releaseNotes={releaseNotes}
          orgSlug={org_slug}
        />
      )}
    </>
  )
}