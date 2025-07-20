'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthActions } from '@/lib/store'
import { MailIcon, AlertTriangleIcon } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const { signInWithMagicLink } = useAuthActions()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Basic email validation
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const { error } = await signInWithMagicLink(email)
      if (error) {
        // Provide more user-friendly error messages
        let errorMessage = 'Failed to send magic link'
        if (error.message?.includes('rate limit')) {
          errorMessage = 'Too many requests. Please wait a moment before trying again.'
        } else if (error.message?.includes('invalid')) {
          errorMessage = 'Please enter a valid email address'
        } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.'
        }
        setError(errorMessage)
      } else {
        setSuccess(true)
      }
    } catch (err: any) {
      console.error('Login error:', err)
      setError('An unexpected error occurred. Please try again.')
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
            Sign in to your account
          </h2>
          <p className="mt-2 text-base text-neutral-500">
            Welcome back! Sign in to manage your release notes and integrations.
          </p>
          <p className="mt-2 text-base text-neutral-500">
            Or{' '}
            <Link
              href="/signup"
              className="font-medium text-brand-600 hover:text-brand-700"
            >
              create a new account
            </Link>
          </p>
        </div>

        <Card className="border-[#e4e7ec]">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-center text-default-font">
              {success ? 'Check your email!' : 'Welcome back'}
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
                    We've sent a magic link to <strong>{email}</strong>
                  </p>
                  <p className="text-sm text-neutral-500">
                    Click the link in your email to sign in. It may take a few minutes to arrive.
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
                    <AlertTriangleIcon className="h-4 w-4" />
                    <AlertDescription className="ml-2 text-base text-red-600 font-medium">
                      {error}
                    </AlertDescription>
                  </Alert>
                )}

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
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="w-full"
                  />
                </div>

                <div className="text-center">
                  <p className="text-base text-neutral-500 mb-4">
                    We'll send you a magic link for a password-free sign in.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? 'Sending magic link...' : 'Send magic link'}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}