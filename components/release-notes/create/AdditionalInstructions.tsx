"use client"

import { useState } from "react"
import { TextArea } from "@/components/subframe-ui/ui/components/TextArea"
import { TextField } from "@/components/subframe-ui/ui/components/TextField"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { FeatherInfo, FeatherCalendar, FeatherTag } from "@subframe/core"

interface AdditionalInstructionsProps {
    data: any
    onUpdate: (data: any) => void
}

export default function AdditionalInstructions({ data, onUpdate }: AdditionalInstructionsProps) {
    const [instructions, setInstructions] = useState(data.instructions || '')
    const [version, setVersion] = useState(data.version || '')
    const [releaseDate, setReleaseDate] = useState(data.releaseDate || '')

    const handleInstructionsChange = (value: string) => {
        setInstructions(value)
        onUpdate({ 
            instructions: value,
            version,
            releaseDate
        })
    }

    const handleVersionChange = (value: string) => {
        setVersion(value)
        onUpdate({ 
            instructions,
            version: value,
            releaseDate
        })
    }

    const handleReleaseDateChange = (value: string) => {
        setReleaseDate(value)
        onUpdate({ 
            instructions,
            version,
            releaseDate: value
        })
    }

    const exampleInstructions = [
        "Focus on user-facing features and improvements",
        "Highlight performance improvements and bug fixes",
        "Include breaking changes and migration notes",
        "Emphasize security updates and patches",
        "Mention new integrations and partnerships"
    ]

    return (
        <div className="space-y-6">
            {/* Release Info */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <TextField
                        label="Version Number"
                        helpText="e.g., v2.1.0, 2024.1, etc."
                        icon={<FeatherTag />}
                    >
                        <TextField.Input
                            placeholder="v1.0.0"
                            value={version}
                            onChange={(e) => handleVersionChange(e.target.value)}
                        />
                    </TextField>
                </div>
                <div>
                    <TextField
                        label="Release Date"
                        helpText="When will this be released?"
                        icon={<FeatherCalendar />}
                    >
                        <TextField.Input
                            type="date"
                            value={releaseDate}
                            onChange={(e) => handleReleaseDateChange(e.target.value)}
                        />
                    </TextField>
                </div>
            </div>

            {/* Additional Instructions */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <FeatherInfo className="w-5 h-5 text-brand-600" />
                    <h3 className="text-lg font-semibold text-default-font">Additional Instructions</h3>
                    <Badge variant="neutral">Optional</Badge>
                </div>
                <p className="text-sm text-neutral-600 mb-4">
                    Provide any specific requirements, focus areas, or context that should influence how AI generates your release notes.
                </p>
                
                <TextArea
                    label=""
                    helpText={`${instructions.length}/500 characters`}
                >
                    <TextArea.Input
                        placeholder="e.g., Focus on user-facing features, highlight performance improvements, include migration notes for breaking changes..."
                        value={instructions}
                        onChange={(e) => handleInstructionsChange(e.target.value)}
                        rows={4}
                        maxLength={500}
                    />
                </TextArea>
            </div>

            {/* Example Instructions */}
            <div>
                <h4 className="text-sm font-medium text-default-font mb-3">Example Instructions:</h4>
                <div className="space-y-2">
                    {exampleInstructions.map((example, index) => (
                        <div
                            key={index}
                            className="flex items-center gap-2 p-2 rounded-lg bg-neutral-50 hover:bg-neutral-100 cursor-pointer transition-colors"
                            onClick={() => handleInstructionsChange(example)}
                        >
                            <div className="w-1.5 h-1.5 rounded-full bg-brand-500"></div>
                            <span className="text-sm text-neutral-700">{example}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Context Preview */}
            {(instructions || version || releaseDate) && (
                <div className="p-4 bg-brand-50 border border-brand-200 rounded-lg">
                    <div className="flex items-center gap-2 text-brand-700 text-sm font-medium mb-2">
                        <FeatherInfo className="w-4 h-4" />
                        Context Summary
                    </div>
                    <div className="space-y-2 text-sm">
                        {version && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-default-font">Version:</span>
                                <span className="text-neutral-600">{version}</span>
                            </div>
                        )}
                        {releaseDate && (
                            <div className="flex items-center gap-2">
                                <span className="font-medium text-default-font">Release Date:</span>
                                <span className="text-neutral-600">{new Date(releaseDate).toLocaleDateString()}</span>
                            </div>
                        )}
                        {instructions && (
                            <div>
                                <span className="font-medium text-default-font">Special Instructions:</span>
                                <p className="text-neutral-600 mt-1">{instructions}</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Help Text */}
            <div className="text-center text-sm text-neutral-500">
                <div className="flex items-center justify-center gap-2">
                    <FeatherInfo className="w-4 h-4" />
                    <span>This step is optional. You can proceed without additional instructions.</span>
                </div>
            </div>
        </div>
    )
}