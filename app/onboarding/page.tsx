'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { CheckCircle, Building2, User, ArrowRight } from 'lucide-react'
import { slugify } from '@/lib/utils'
import Image from 'next/image'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    organizationName: '',
    organizationSlug: ''
  })
  
  const router = useRouter()
  const supabase = createClientComponentClient()

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
    if (!formData.organizationName.trim() || !formData.firstName.trim()) {
      setError('Please fill in all required fields')
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
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({
          id: user.user.id,
          name: formData.organizationName.trim(),
          slug: formData.organizationSlug || slugify(formData.organizationName),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
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
          organization_id: user.user.id,
          user_id: user.user.id,
          role: 'owner',
          created_at: new Date().toISOString()
        })

      if (memberError) {
        console.error('Failed to create membership:', memberError)
        // Don't fail onboarding for this, as the user is still the owner
      }

      // Update user metadata if needed
      if (formData.firstName || formData.lastName) {
        await supabase.auth.updateUser({
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName,
            full_name: `${formData.firstName} ${formData.lastName}`.trim()
          }
        })
      }

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
            Let’s get your organization set up in just a few steps. You’ll be publishing beautiful release notes in minutes!
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center ${step >= 1 ? 'text-brand-600' : 'text-neutral-400'}`}> 
            {step > 1 ? <CheckCircle className="w-5 h-5" /> : <User className="w-5 h-5" />}
            <span className="ml-2 text-base font-medium">Profile</span>
          </div>
          <ArrowRight className="w-4 h-4 text-neutral-400" />
          <div className={`flex items-center ${step >= 2 ? 'text-brand-600' : 'text-neutral-400'}`}> 
            <Building2 className="w-5 h-5" />
            <span className="ml-2 text-base font-medium">Organization</span>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-center text-xl font-semibold text-default-font">
              {step === 1 ? 'Tell us about yourself' : 'Create your organization'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription className="text-base text-red-600 font-medium">{error}</AlertDescription>
              </Alert>
            )}

            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-base font-medium text-default-font mb-1">
                    First Name *
                  </label>
                  <Input
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter your first name"
                    required
                  />
                </div>
                <div>
                  <label className="block text-base font-medium text-default-font mb-1">
                    Last Name
                  </label>
                  <Input
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter your last name"
                  />
                </div>
                <Button 
                  onClick={() => setStep(2)} 
                  className="w-full"
                  disabled={!formData.firstName.trim()}
                >
                  Continue
                </Button>
              </div>
            ) : (
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
                <div className="flex space-x-3">
                  <Button 
                    variant="outline" 
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button 
                    onClick={handleComplete}
                    disabled={loading || !formData.organizationName.trim()}
                    className="flex-1"
                  >
                    {loading ? 'Creating...' : 'Complete Setup'}
                  </Button>
                </div>
              </div>
            )}
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