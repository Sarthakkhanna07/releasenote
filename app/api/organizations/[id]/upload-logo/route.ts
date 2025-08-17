import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

// POST: Uploads logo or favicon for an organization
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('Upload API called with orgId:', params.id)
    
    const supabase = createRouteHandlerClient({ cookies })
    const orgId = params.id

    if (!orgId) {
      console.log('No orgId provided')
      return NextResponse.json({ error: 'Organization ID is required' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session?.user) {
      console.log('Authentication failed:', sessionError)
      return NextResponse.json({ error: 'Unauthorized' }, { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Check if user is a member of this organization
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('organization_id, role')
      .eq('user_id', session.user.id)
      .eq('organization_id', orgId)
      .single()

    if (membershipError || !membership) {
      console.log('Organization membership check failed:', membershipError)
      return NextResponse.json({ error: 'Organization not found or access denied' }, { 
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    let formData
    try {
      formData = await req.formData()
    } catch (formError) {
      console.error('Failed to parse form data:', formError)
      return NextResponse.json({ error: 'Failed to parse form data' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const file = formData.get('file') as File
    const type = formData.get('type') as string // 'logo' or 'favicon'

    console.log('File:', file ? `${file.name} (${file.size} bytes, ${file.type})` : 'null')
    console.log('Type:', type)

    if (!file) {
      console.log('No file in form data')
      return NextResponse.json({ error: 'No file provided' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    if (type !== 'logo' && type !== 'favicon') {
      console.log('Invalid type:', type)
      return NextResponse.json({ error: 'Type must be either "logo" or "favicon"' }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Validate file type and size (max 5MB, PNG/JPEG/SVG/ICO)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/x-icon', 'image/vnd.microsoft.icon']
    const maxSize = 5 * 1024 * 1024 // 5MB
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` 
      }, { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: `File too large. Maximum size is 5MB, received ${Math.round(file.size / 1024 / 1024 * 100) / 100}MB` 
      }, { 
        status: 413,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Use the pre-created storage bucket
    const bucketName = 'org-assets'

    // Generate storage path with unique identifier to avoid caching issues
    const ext = file.name.split('.').pop() || 'png'
    const timestamp = Date.now()
    const filename = `${type}-${timestamp}.${ext}`
    const storagePath = `${orgId}/${filename}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(storagePath, file, { 
        upsert: true, 
        contentType: file.type,
        cacheControl: '3600'
      })

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      
      // Provide helpful error message if bucket doesn't exist
      if (uploadError.message.includes('Bucket not found')) {
        return NextResponse.json({ 
          error: 'Storage bucket not configured. Please contact support.' 
        }, { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        })
      }
      
      return NextResponse.json({ 
        error: `Failed to upload file: ${uploadError.message}` 
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Get public URL with cache busting
    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(storagePath)
    const baseUrl = urlData?.publicUrl
    const publicUrl = baseUrl ? `${baseUrl}?v=${timestamp}` : null

    if (!publicUrl) {
      return NextResponse.json({ 
        error: 'Failed to generate public URL for uploaded file' 
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    // Update org metadata
    const updateField = type === 'logo' ? { logo_url: publicUrl } : { favicon_url: publicUrl }
    const { error: updateError } = await supabase
      .from('organizations')
      .update(updateField)
      .eq('id', orgId)

    if (updateError) {
      console.error('Database update error:', updateError)
      // Try to clean up the uploaded file if database update fails
      await supabase.storage.from(bucketName).remove([storagePath])
      return NextResponse.json({ 
        error: `Failed to update organization: ${updateError.message}` 
      }, { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return NextResponse.json({ 
      url: publicUrl,
      message: `${type === 'logo' ? 'Logo' : 'Favicon'} uploaded successfully`
    }, { 
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      }
    })

  } catch (error: any) {
    console.error('Upload API error:', error)
    return NextResponse.json({ 
      error: 'Internal server error during upload' 
    }, { 
      status: 500,
      headers: {
        'Content-Type': 'application/json',
      }
    })
  }
}
