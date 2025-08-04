'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Building2 } from 'lucide-react'
import { slugify } from '@/lib/utils'
import Image from 'next/image'
import { useAuthStore } from '@/lib/store'

export default function OnboardingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [_userName, setUserName] = useState('')
  const [formData, setFormData] = useState({
    organizationName: '',
    organizationSlug: ''
  })
  
  const router = useRouter()
  const supabase = createClientComponentClient()
  const fetchOrganization = useAuthStore(state => state.fetchOrganization)

  useEffect(() => {
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const firstName = user.user_metadata?.first_name || ''
        const lastName = user.user_metadata?.last_name || ''
        setUserName(`${firstName} ${lastName}`.trim() || user.email || '')
      }
    }
    getUserData()
  }, [supabase.auth])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Auto-generate slug when organization name changes
      ...(field === 'organizationName' ? { organizationSlug: slugify(value) } : {})
    }))
    setError('')
  }

  const handleComplete = async () => {
    if (!formData.organizationName.trim()) {
      setError('Please enter your organization name')
      return
    }

    setLoading(true)
    setError('')

    try {
      const { data: user } = await supabase.auth.getUser()
      if (!user.user) {
        setError('Authentication required')
        return
      }

      // Create organization
      const { data: _orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: formData.organizationName.trim(),
          slug: formData.organizationSlug || slugify(formData.organizationName)
        })
        .select()
        .single()

      if (orgError) {
        if (orgError.code === '23505') {
          setError('Organization name or slug already exists. Please choose a different name.')
        } else {
          setError(`Failed to create organization: ${orgError.message}`)
        }
        return
      }

      // Create organization membership
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: _orgData.id,
          user_id: user.user.id,
          role: 'owner'
        })

      if (memberError) {
        console.error('Failed to create membership:', memberError)
        // Don't fail onboarding for this, as the user is still the owner
      }

      // Refresh organization data in auth store
      await fetchOrganization(user.user.id)

      // Redirect to dashboard
      router.push('/dashboard?welcome=true')
      
    } catch (error) {
      console.error('Onboarding error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-12 w-auto flex items-center justify-center">
            <Image
              src="/rn-logo.svg"
              alt="Release Notes AI"
              width={120}
              height={32}
              priority
              className="h-8 w-auto"
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-default-font">
            Welcome to Release Notes AI
          </h2>
          <p className="mt-2 text-base text-neutral-500">
            Let&apos;s get your organization set up in just a few steps. You&apos;ll be publishing beautiful release notes in minutes!
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center">
          <div className="flex items-center text-brand-600"> 
            <Building2 className="w-5 h-5" />
            <span className="ml-2 text-base font-medium">Organization Setup</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl font-semibold text-default-font">
              Create your organization
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-base text-red-600 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-base font-medium text-default-font mb-1">
                  Organization Name *
                </label>
                <Input
                  value={formData.organizationName}
                  onChange={(e) => handleInputChange('organizationName', e.target.value)}
                  placeholder="Enter your organization name"
                  required
                />
              </div>
              <div>
                <label className="block text-base font-medium text-default-font mb-1">
                  Organization URL
                </label>
                <div className="flex">
                  <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-neutral-200 bg-neutral-100 text-neutral-500 text-base">
                    yourapp.com/notes/
                  </span>
                  <Input
                    value={formData.organizationSlug}
                    onChange={(e) => handleInputChange('organizationSlug', e.target.value)}
                    placeholder="your-org"
                    className="rounded-l-none"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  This will be your public release notes URL
                </p>
              </div>
              <Button 
                onClick={handleComplete}
                disabled={loading || !formData.organizationName.trim()}
                className="w-full"
              >
                {loading ? 'Creating...' : 'Complete Setup'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-xs text-neutral-400">
            Need help? Contact support at <span className="underline">help@releasenotes.ai</span>
          </p>
        </div>
      </div>
    </div>
  )
}