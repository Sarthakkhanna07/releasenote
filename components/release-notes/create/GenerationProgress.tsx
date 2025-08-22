"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { FeatherZap, FeatherCheck, FeatherLoader, FeatherArrowRight, FeatherAlertCircle } from "@subframe/core"

interface GenerationProgressProps {
    wizardData: any
}

interface GenerationStep {
    id: string
    title: string
    description: string
    status: 'pending' | 'processing' | 'completed' | 'error'
}

export default function GenerationProgress({ wizardData }: GenerationProgressProps) {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [generationError, setGenerationError] = useState<string | null>(null)
    const [generatedContent, setGeneratedContent] = useState<any>(null)
    // Prevent duplicate runs in React Strict Mode (dev) which can cause double redirects
    const hasStartedRef = useRef(false)

    // Detect whether this is the Linear flow (no repository object provided)
    const isLinearFlow = !wizardData?.repository

    const initialSteps: GenerationStep[] = isLinearFlow
        ? [
            {
                id: 'prepare-scope',
                title: 'Preparing Linear Scope',
                description: 'Validating selected teams, projects, and filters',
                status: 'processing'
            },
            {
                id: 'generate-notes',
                title: 'Generating Release Notes',
                description: 'AI is creating your professional release notes',
                status: 'pending'
            },
            {
                id: 'finalize',
                title: 'Finalizing',
                description: 'Preparing your release notes for editing',
                status: 'pending'
            }
        ]
        : [
            {
                id: 'fetch-data',
                title: 'Fetching Repository Data',
                description: 'Analyzing commits, issues, and repository information',
                status: 'processing'
            },
            {
                id: 'process-content',
                title: 'Processing Content',
                description: 'Extracting relevant information and organizing data',
                status: 'pending'
            },
            {
                id: 'build-prompt',
                title: 'Building AI Prompt',
                description: 'Constructing system and user prompts with context',
                status: 'pending'
            },
            {
                id: 'generate-notes',
                title: 'Generating Release Notes',
                description: 'AI is creating your professional release notes',
                status: 'pending'
            },
            {
                id: 'finalize',
                title: 'Finalizing',
                description: 'Preparing your release notes for editing',
                status: 'pending'
            }
        ]

    const [steps, setSteps] = useState<GenerationStep[]>(initialSteps)

    useEffect(() => {
        if (hasStartedRef.current) return
        hasStartedRef.current = true
        startGeneration()
    }, [])

    const startGeneration = async () => {
        try {
            let generationResult: any = null

            if (isLinearFlow) {
                // Linear flow: skip repo fetch and call Linear generation API
                await processStep(0, async () => {
                    // Basic validation delay to show progress
                    await new Promise(resolve => setTimeout(resolve, 400))
                    return { scopeReady: true }
                })

                await processStep(1, async () => {
                    const payload = {
                        teams: wizardData.workspace?.teams || [],
                        projects: wizardData.workspace?.projects || [],
                        dateRange: wizardData.dataSources?.dateRange || undefined,
                        issueFilters: wizardData.dataSources?.issueFilters || undefined,
                        // Pass only selected issues if user chose them in the preview
                        selectedIssues: wizardData.dataSources?.selectedIssues || undefined,
                        template: wizardData.template || undefined,
                        instructions: wizardData.instructions || undefined,
                        version: wizardData.version || undefined,
                        releaseDate: wizardData.releaseDate || undefined
                    }

                    const response = await fetch('/api/linear/generate-release-notes', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    })

                    if (!response.ok) {
                        const errJson = await response.json().catch(() => ({})) as any
                        console.error('Linear generation API error:', errJson)
                        const msg = [errJson?.error, errJson?.details].filter(Boolean).join(' - ')
                        throw new Error(msg || 'Failed to generate release notes')
                    }

                    const result = await response.json()
                    generationResult = result
                    setGeneratedContent(result)
                    return result
                })

                // Finalize
                await processStep(2, async () => {
                    await new Promise(resolve => setTimeout(resolve, 500))
                    return { finalized: true }
                })
            } else {
                // GitHub flow (existing)
                // Step 1: Fetch repository data
                await processStep(0, async () => {
                    const response = await fetch('/api/release-notes/repository-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            repository: wizardData.repository,
                            dataSources: wizardData.dataSources
                        })
                    })
                    
                    if (!response.ok) throw new Error('Failed to fetch repository data')
                    return await response.json()
                })

                // Step 2: Process content
                await processStep(1, async () => {
                    // Simulate content processing
                    await new Promise(resolve => setTimeout(resolve, 1500))
                    return { processed: true }
                })

                // Step 3: Build prompt
                await processStep(2, async () => {
                    // Simulate prompt building
                    await new Promise(resolve => setTimeout(resolve, 1000))
                    return { prompt: 'built' }
                })

                // Step 4: Generate release notes
                await processStep(3, async () => {
                    const response = await fetch('/api/release-notes/generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            repository: wizardData.repository,
                            dataSources: wizardData.dataSources,
                            template: wizardData.template,
                            instructions: wizardData.instructions,
                            version: wizardData.version,
                            releaseDate: wizardData.releaseDate
                        })
                    })
                    
                    if (!response.ok) throw new Error('Failed to generate release notes')
                    const result = await response.json()
                    generationResult = result
                    setGeneratedContent(result)
                    return result
                })

                // Step 5: Finalize
                await processStep(4, async () => {
                    await new Promise(resolve => setTimeout(resolve, 500))
                    return { finalized: true }
                })
            }

            // Redirect to editor with the draft ID after a brief delay
            setTimeout(() => {
                if (generationResult?.draftId) {
                    router.push(`/dashboard/releases/editor/${generationResult.draftId}`)
                } else {
                    router.push(`/dashboard/releases/editor?generated=true`)
                }
            }, 2000)

        } catch (error) {
            setGenerationError(error instanceof Error ? error.message : 'Generation failed')
            updateStepStatus(currentStep, 'error')
        }
    }

    const processStep = async (stepIndex: number, processor: () => Promise<any>) => {
        setCurrentStep(stepIndex)
        updateStepStatus(stepIndex, 'processing')
        
        try {
            await processor()
            updateStepStatus(stepIndex, 'completed')
            
            // Brief pause between steps for better UX
            await new Promise(resolve => setTimeout(resolve, 800))
        } catch (error) {
            updateStepStatus(stepIndex, 'error')
            throw error
        }
    }

    const updateStepStatus = (stepIndex: number, status: GenerationStep['status']) => {
        setSteps(prev => prev.map((step, index) => 
            index === stepIndex ? { ...step, status } : step
        ))
    }

    const getStepIcon = (step: GenerationStep) => {
        switch (step.status) {
            case 'completed':
                return <FeatherCheck className="w-5 h-5 text-green-600" />
            case 'processing':
                return <FeatherLoader className="w-5 h-5 text-brand-600 animate-spin" />
            case 'error':
                return <FeatherAlertCircle className="w-5 h-5 text-red-600" />
            default:
                return <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />
        }
    }

    const getStepColor = (step: GenerationStep) => {
        switch (step.status) {
            case 'completed':
                return 'text-green-600'
            case 'processing':
                return 'text-brand-600'
            case 'error':
                return 'text-red-600'
            default:
                return 'text-neutral-400'
        }
    }

    const completedSteps = steps.filter(step => step.status === 'completed').length
    const progress = (completedSteps / steps.length) * 100

    return (
        <DefaultPageLayout>
            <div className="flex h-full w-full flex-col items-start">
                {/* Header */}
                <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-8 py-6">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <FeatherZap className="text-brand-600" />
                            <span className="text-2xl font-bold text-default-font">
                                Generating Release Notes
                            </span>
                        </div>
                    </div>
                    
                    <Badge variant="brand">
                        {Math.round(progress)}% Complete
                    </Badge>
                </div>

                <div className="flex w-full grow shrink-0 basis-0 flex-col items-center justify-center bg-default-background px-8 py-16">
                    <div className="w-full max-w-2xl">
                        {/* Progress Bar */}
                        <div className="w-full bg-neutral-200 rounded-full h-2 mb-8">
                            <div 
                                className="bg-brand-600 h-2 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Repository Info */}
                        <div className="text-center mb-8">
                            <h2 className="text-xl font-semibold text-default-font mb-2">
                                {wizardData.repository?.full_name}
                            </h2>
                            <p className="text-neutral-600">
                                Creating AI-powered release notes from your repository data
                            </p>
                        </div>

                        {/* Generation Steps */}
                        <div className="space-y-4 mb-8">
                            {steps.map((step, index) => (
                                <div
                                    key={step.id}
                                    className={`flex items-center gap-4 p-4 rounded-lg border transition-all duration-300 ${
                                        step.status === 'processing' 
                                            ? 'bg-brand-50 border-brand-200' 
                                            : step.status === 'completed'
                                            ? 'bg-green-50 border-green-200'
                                            : step.status === 'error'
                                            ? 'bg-red-50 border-red-200'
                                            : 'bg-neutral-50 border-neutral-200'
                                    }`}
                                >
                                    {getStepIcon(step)}
                                    <div className="flex-1">
                                        <h3 className={`font-medium ${getStepColor(step)}`}>
                                            {step.title}
                                        </h3>
                                        <p className="text-sm text-neutral-600">
                                            {step.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Error State */}
                        {generationError && (
                            <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
                                <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                                    <FeatherAlertCircle className="w-5 h-5" />
                                    Generation Failed
                                </div>
                                <p className="text-red-600 text-sm mb-4">{generationError}</p>
                                <Button
                                    variant="neutral-secondary"
                                    onClick={() => window.location.reload()}
                                >
                                    Try Again
                                </Button>
                            </div>
                        )}

                        {/* Success State */}
                        {progress === 100 && !generationError && (
                            <div className="text-center">
                                <div className="p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
                                    <div className="flex items-center justify-center gap-2 text-green-700 font-medium mb-2">
                                        <FeatherCheck className="w-5 h-5" />
                                        Release Notes Generated Successfully!
                                    </div>
                                    <p className="text-green-600 text-sm">
                                        Redirecting you to the editor to review and customize your release notes...
                                    </p>
                                </div>
                                
                                <Button
                                    onClick={() => {
                                        if (generatedContent?.draftId) {
                                            router.push(`/dashboard/releases/editor/${generatedContent.draftId}`)
                                        } else {
                                            router.push('/dashboard/releases')
                                        }
                                    }}
                                    icon={<FeatherArrowRight />}
                                >
                                    {generatedContent?.draftId ? 'Go to Editor' : 'View Releases'}
                                </Button>
                            </div>
                        )}

                        {/* Current Step Indicator */}
                        {!generationError && progress < 100 && (
                            <div className="text-center text-sm text-neutral-500">
                                <p>This may take a few moments. Please don't close this page.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </DefaultPageLayout>
    )
}