"use client"

import React from "react"
import { useRouter } from "next/navigation"
import { DefaultPageLayout } from "@/components/subframe-ui/ui/layouts/DefaultPageLayout"
import { Button } from "@/components/subframe-ui/ui/components/Button"
import { Badge } from "@/components/subframe-ui/ui/components/Badge"
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton"
import { 
  FeatherArrowLeft, 
  FeatherZap,
  FeatherGithub,
  FeatherLayout,
  FeatherCheck, 
  FeatherArrowRight
} from "@subframe/core"
import Link from "next/link"

interface Platform {
  id: "github" | "linear"
  name: string
  icon: React.ComponentType<any>
    description: string
  features: string[]
  status: "connected" | "not_connected" | "checking"
  route: string
}

export default function PlatformSelectionPage() {
    const router = useRouter()
  const [platforms, setPlatforms] = React.useState<Platform[]>([
    {
      id: "github",
      name: "GitHub",
      icon: FeatherGithub,
      description: "Generate from commits, pull requests, and issues",
      features: [
        "Commit analysis",
        "PR tracking",
        "Issue management",
        "Repository insights"
      ],
      status: "checking",
      route: "/dashboard/releases/new/ai/github"
    },
    {
      id: "linear",
      name: "Linear",
      icon: FeatherLayout,
      description: "Generate from teams, projects, and development workflow",
      features: [
        "Team-based organization",
        "Project milestones",
        "Issue tracking",
        "Workflow insights"
      ],
      status: "checking",
      route: "/dashboard/releases/new/ai/linear"
    }
  ])

  React.useEffect(() => {
    checkPlatformStatus()
  }, [])

  const checkPlatformStatus = async () => {
    // GitHub status
    try {
      const gh = await fetch("/api/integrations/github/repositories")
      updatePlatformStatus("github", gh.ok ? "connected" : "not_connected")
    } catch {
      updatePlatformStatus("github", "not_connected")
    }
    // Linear status (lightweight DB check to avoid rate limits)
    try {
      const ln = await fetch("/api/integrations/linear/status")
      const data = ln.ok ? await ln.json() : { connected: false }
      updatePlatformStatus("linear", data.connected ? "connected" : "not_connected")
    } catch {
      updatePlatformStatus("linear", "not_connected")
    }
  }

  const updatePlatformStatus = (
    platformId: string,
    status: "connected" | "not_connected" | "checking"
  ) => {
    setPlatforms(prev => prev.map(p => (p.id === platformId ? { ...p, status } : p)))
  }

  const handlePlatformSelect = (platform: Platform) => {
    if (platform.status === "connected") {
      router.push(platform.route)
    } else {
      router.push(`/dashboard/integrations?platform=${platform.id}`)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "connected":
        return <Badge variant="success" icon={<FeatherCheck />}>Connected</Badge>
      case "not_connected":
        return <Badge variant="warning">Not Connected</Badge>
            default:
        return <Badge variant="neutral">Checking...</Badge>
    }
  }

    return (
        <DefaultPageLayout>
            <div className="flex h-full w-full flex-col items-start">
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
                <span className="text-2xl font-bold text-default-font">Choose Your Platform</span>
                            </div>
                            <span className="text-base text-neutral-500">
                Select the platform you want to generate release notes from
                            </span>
                        </div>
                    </div>
                </div>

        <div className="flex w-full grow shrink-0 basis-0 flex-col items-center gap-16 bg-default-background px-6 py-16">
          <div className="flex w-full max-w-[1024px] flex-col items-center gap-8">
            <div className="flex flex-col items-center gap-4 text-center">
              <span className="text-2xl font-bold text-brand-600">Select Your Data Source</span>
              <span className="text-lg text-neutral-500">
                Choose the platform that contains your development data
              </span>
                    </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
              {platforms.map(platform => {
                const Icon = platform.icon
                const isConnected = platform.status === "connected"
                return (
                  <div
                    key={platform.id}
                    className={`relative p-8 border-2 rounded-xl transition-all duration-200 cursor-pointer ${
                      isConnected
                        ? "border-brand-600 bg-brand-50 hover:border-brand-700 hover:bg-brand-100"
                        : "border-neutral-200 bg-neutral-50 hover:border-neutral-300"
                    }`}
                    onClick={() => handlePlatformSelect(platform)}
                  >
                    <div className="absolute top-4 right-4">{getStatusBadge(platform.status)}</div>
                    <div className="flex items-center gap-4 mb-6">
                      <div
                        className={`p-3 rounded-lg ${
                          isConnected ? "bg-brand-600 text-white" : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        <Icon className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold text-default-font">{platform.name}</h3>
                        <p className="text-neutral-600">{platform.description}</p>
                      </div>
                                    </div>
                    <div className="space-y-3 mb-6">
                      {platform.features.map((f, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            isConnected ? "bg-brand-600" : "bg-neutral-400"
                          }`}></div>
                          <span className="text-neutral-700">{f}</span>
                                </div>
                            ))}
                        </div>
                            <Button
                      className={`w-full ${
                        isConnected ? "bg-brand-600 hover:bg-brand-700" : "bg-neutral-600 hover:bg-neutral-700"
                      }`}
                      icon={<FeatherArrowRight />}
                      disabled={platform.status === "checking"}
                    >
                      {isConnected ? `Continue with ${platform.name}` : `Connect ${platform.name}`}
                            </Button>
                                    </div>
                )
              })}
                            </div>

            <div className="text-center text-neutral-500 max-w-2xl">
              <p>Don't see your platform? Contact us to add support for your preferred development tools.</p>
                        </div>
                    </div>
                </div>
            </div>
        </DefaultPageLayout>
    )
} 