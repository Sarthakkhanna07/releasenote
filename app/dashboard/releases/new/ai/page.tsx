"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton"
import { 
  FeatherArrowLeft, 
  FeatherArrowRight, 
  FeatherCheck, 
  FeatherZap, 
  FeatherGitBranch, 
  FeatherMessageSquare, 
  FeatherSettings, 
  FeatherWand2 
} from "@subframe/core"
import Link from "next/link"

// Import the step components (we'll create these)
import RepositorySelector from "@/components/release-notes/create/RepositorySelector"
import DataSourceSelector from "@/components/release-notes/create/DataSourceSelector"
import TemplateSelector from "@/components/release-notes/create/TemplateSelector"
import AdditionalInstructions from "@/components/release-notes/create/AdditionalInstructions"
import GenerationProgress from "@/components/release-notes/create/GenerationProgress"

interface WizardStep {
    id: string
    title: string
    description: string
    icon: any
    component: React.ComponentType<any>
}

export default function AICreationPage() {
    const router = useRouter()
    const [currentStep, setCurrentStep] = useState(0)
    const [wizardData, setWizardData] = useState({
        repository: null,
        dataSources: null,
        template: null,
        instructions: '',
        isGenerating: false
    })

    const steps: WizardStep[] = [
        {
            id: 'repository',
            title: 'Select Repository',
            description: 'Choose the repository for your release notes',
            icon: FeatherGitBranch,
            component: RepositorySelector
        },
        {
            id: 'datasource',
            title: 'Choose Data Sources',
            description: 'Select what to analyze for your release notes',
            icon: FeatherMessageSquare,
            component: DataSourceSelector
        },
        {
            id: 'template',
            title: 'Select Template',
            description: 'Choose a template or let AI decide the structure',
            icon: FeatherSettings,
            component: TemplateSelector
        },
        {
            id: 'instructions',
            title: 'Additional Instructions',
            description: 'Add any specific requirements or context',
            icon: FeatherWand2,
            component: AdditionalInstructions
        }
    ]

    const progress = ((currentStep + 1) / steps.length) * 100

    const handleNext = () => {
        if (currentStep < steps.length - 1) {
            setCurrentStep(currentStep + 1)
        } else {
            // Start generation
            handleGeneration()
        }
    }

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1)
        }
    }

    const handleGeneration = async () => {
        setWizardData(prev => ({ ...prev, isGenerating: true }))
        // TODO: Implement AI generation logic
        // This will call the generation API and redirect to editor
    }

    const updateWizardData = (stepData: any) => {
        setWizardData(prev => ({ ...prev, ...stepData }))
    }

    const isStepComplete = (stepIndex: number) => {
        const step = steps[stepIndex]
        switch (step.id) {
            case 'repository':
                return wizardData.repository !== null
            case 'datasource':
                return wizardData.dataSources !== null
            case 'template':
                return wizardData.template !== null || wizardData.template === 'ai-decide'
            case 'instructions':
                return true // Optional step
            default:
                return false
        }
    }

    const canProceed = isStepComplete(currentStep)

    if (wizardData.isGenerating) {
        return <GenerationProgress wizardData={wizardData} />
    }

    return (
        <DefaultPageLayout>
            <div className="flex h-full w-full flex-col items-start">
                {/* Header */}
                <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-8 py-6">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/releases/start">
                            <IconButton
                                size="medium"
                                icon={<FeatherArrowLeft />}
                                variant="neutral-tertiary"
                            />
                        </Link>
                        <div className="flex flex-col items-start gap-1">
                            <div className="flex items-center gap-2">
                                <FeatherZap className="text-brand-600" />
                                <span className="text-2xl font-bold text-default-font">
                                    AI Release Notes Wizard
                                </span>
                            </div>
                            <span className="text-base text-neutral-500">
                                Step {currentStep + 1} of {steps.length}: {steps[currentStep].description}
                            </span>
                        </div>
                    </div>
                    
                    <Badge variant="brand">
                        {Math.round(progress)}% Complete
                    </Badge>
                </div>

                <div className="flex w-full grow shrink-0 basis-0 flex-col items-start bg-default-background">
                    {/* Progress Bar */}
                    <div className="w-full bg-neutral-100">
                        <div 
                            className="h-1 bg-brand-600 transition-all duration-300 ease-out"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Step Indicators */}
                    <div className="w-full px-8 py-6 border-b border-solid border-neutral-border">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                            {steps.map((step, index) => (
                                <div key={step.id} className="flex items-center">
                                    <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                                        index < currentStep 
                                            ? 'bg-green-500 border-green-500 text-white' 
                                            : index === currentStep
                                            ? 'bg-brand-600 border-brand-600 text-white'
                                            : 'bg-white border-neutral-200 text-neutral-400'
                                    }`}>
                                        {index < currentStep ? (
                                            <FeatherCheck className="w-5 h-5" />
                                        ) : (
                                            <step.icon className="w-5 h-5" />
                                        )}
                                    </div>
                                    
                                    {index < steps.length - 1 && (
                                        <div className={`w-16 h-0.5 mx-2 transition-all duration-300 ${
                                            index < currentStep ? 'bg-green-500' : 'bg-neutral-200'
                                        }`} />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Step Content */}
                    <div className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-start gap-8 py-12 overflow-auto">
                        <div className="w-full max-w-4xl mx-auto">
                            <div className="bg-white rounded-xl border border-neutral-200 p-8">
                                <div className="mb-6">
                                    <h2 className="text-2xl font-bold text-default-font mb-2">
                                        {steps[currentStep].title}
                                    </h2>
                                    <p className="text-neutral-500">
                                        {steps[currentStep].description}
                                    </p>
                                </div>

                                {(() => {
                                    const StepComponent = steps[currentStep].component
                                    return (
                                        <StepComponent
                                            data={wizardData}
                                            onUpdate={updateWizardData}
                                        />
                                    )
                                })()}
                            </div>
                        </div>
                    </div>

                    {/* Navigation */}
                    <div className="w-full border-t border-solid border-neutral-border px-8 py-6">
                        <div className="flex items-center justify-between max-w-4xl mx-auto">
                            <Button
                                variant="neutral-tertiary"
                                onClick={handleBack}
                                disabled={currentStep === 0}
                                icon={<FeatherArrowLeft />}
                            >
                                Back
                            </Button>

                            <div className="flex items-center gap-2 text-sm text-neutral-500">
                                {canProceed ? (
                                    <div className="flex items-center gap-2 text-green-600">
                                        <FeatherCheck className="w-4 h-4" />
                                        Ready to proceed
                                    </div>
                                ) : (
                                    <span>Complete this step to continue</span>
                                )}
                            </div>

                            <Button
                                onClick={handleNext}
                                disabled={!canProceed}
                                icon={currentStep === steps.length - 1 ? <FeatherZap /> : <FeatherArrowRight />}
                            >
                                {currentStep === steps.length - 1 ? 'Generate Release Notes' : 'Next'}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </DefaultPageLayout>
    )
} 