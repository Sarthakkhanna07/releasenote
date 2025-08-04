'use client'

import { useState } from 'react'

import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthActions } from '@/lib/store'
import { MailIcon } from 'lucide-react'

export default function SignupPage() {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: ''
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signUp } = useAuthActions()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { error } = await signUp(formData.email, {
        firstName: formData.firstName,
        lastName: formData.lastName
      })
      if (error) {
        setError(error.message || 'Failed to send magic link')
      } else {
        setSuccess(true)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to send magic link'
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto h-12 w-auto flex items-center justify-center">
            <Image
              src="/rn-logo.svg"
              alt="Release Notes Generator"
              width={120}
              height={32}
              priority
              className="h-8 w-auto"
              onError={() => {
                // Fallback if logo fails to load
                console.warn('Logo failed to load, using text fallback')
              }}
            />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-default-font">
            Create your account
          </h2>
          <p className="mt-2 text-base text-neutral-500">
            Get started with Release Note AI in seconds. No password required!
          </p>
          <p className="mt-2 text-base text-neutral-500">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              Sign in here
            </Link>
          </p>
        </div>

        <Card className="border-[#e4e7ec]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-center text-default-font">
              {success ? 'Check your email!' : 'Get started today'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {success ? (
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <MailIcon className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <p className="text-base text-green-700 mb-2">
                    We&apos;ve sent a magic link to <strong>{formData.email}</strong>
                  </p>
                  <p className="text-sm text-neutral-500">
                    Click the link in your email to complete your registration. It may take a few minutes to arrive.
                  </p>
                </div>
                <Button
                  onClick={() => setSuccess(false)}
                  variant="outline"
                  className="w-full"
                >
                  Send another link
                </Button>
              </div>
            ) : (
              <form className="space-y-6" onSubmit={handleSubmit}>
                {error && (
                  <Alert variant="destructive">
                    <AlertDescription className="text-base text-red-600 font-medium">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-base font-medium text-default-font mb-1">
                      First name
                    </label>
                    <Input
                      id="firstName"
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label htmlFor="lastName" className="block text-base font-medium text-default-font mb-1">
                      Last name
                    </label>
                    <Input
                      id="lastName"
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      placeholder="Doe"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-base font-medium text-default-font mb-1">
                    Email address
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="john@company.com"
                  />
                </div>

                <div className="text-center">
                  <p className="text-base text-neutral-500 mb-4">
                    We&apos;ll send you a magic link to complete your registration - no password needed!
                  </p>
                </div>

                <div className="flex items-center">
                  <input
                    id="agree-terms"
                    name="agree-terms"
                    type="checkbox"
                    required
                    className="h-4 w-4 text-brand-600 focus:ring-brand-600 border-neutral-300 rounded"
                  />
                  <label htmlFor="agree-terms" className="ml-2 block text-base text-default-font">
                    I agree to the{' '}
                    <Link href="/terms" className="text-brand-600 hover:text-brand-700">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="text-brand-600 hover:text-brand-700">
                      Privacy Policy
                    </Link>
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sending magic link...' : 'Create account'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}