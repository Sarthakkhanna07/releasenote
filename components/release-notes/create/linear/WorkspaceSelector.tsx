"use client"
import { useEffect, useState } from "react"
import { RefreshCwIcon, UsersIcon, FolderIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { LinearTeamManager } from "@/components/integrations/linear-team-manager"
import LinearProjectSelector from "./components/LinearProjectSelector"

export default function WorkspaceSelector({ data, onUpdate }) {
  const [selectedTeams, setSelectedTeams] = useState<string[]>(data?.workspace?.teams || [])
  const [selectedProjects, setSelectedProjects] = useState<string[]>(data?.workspace?.projects || [])
  const [loading, setLoading] = useState(false)
  const [workspaceInfo, setWorkspaceInfo] = useState<any>(null)

  useEffect(() => {
    onUpdate({ workspace: { teams: selectedTeams, projects: selectedProjects } })
  }, [selectedTeams, selectedProjects])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await fetch('/api/integrations/linear/test-connection', { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accessToken: data?.accessToken })
        })
        const json = await res.json()
        setWorkspaceInfo(json)
      } catch {} finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="rounded-2xl border shadow-sm bg-white overflow-hidden">
      {/* Workspace Banner */}
      {workspaceInfo?.tests?.[0]?.details?.organization?.name && (
        <div className="flex items-center gap-3 px-5 py-3 bg-blue-50 border-b">
          <UsersIcon className="w-4 h-4 text-blue-600" />
          <span className="text-sm font-medium text-blue-800">
            {workspaceInfo.tests[0].details.organization.name}
          </span>
          <Badge variant="outline" className="ml-auto">Connected</Badge>
          <Button variant="outline" size="sm" onClick={() => window.location.reload()} disabled={loading}>
            <RefreshCwIcon className={`w-4 h-4 mr-1 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      )}

             {/* Teams Section */}
       <div className="px-6 py-5 border-b">
         <div className="flex items-center gap-2 mb-3">
           <UsersIcon className="w-4 h-4 text-neutral-700" />
           <h3 className="text-sm font-semibold text-neutral-900">Select Teams</h3>
         </div>
         <div className="text-neutral-900">
           <LinearTeamManager
             selectedTeams={selectedTeams}
             onTeamSelect={setSelectedTeams}
             selectionMode="multiple"
           />
         </div>
       </div>

       {/* Projects Section */}
       <div className="px-6 py-5 text-neutral-900"> 
         <LinearProjectSelector
           selectedProjects={selectedProjects}
           onProjectSelect={setSelectedProjects}
           selectedTeams={selectedTeams}
         />
       </div>
    </div>
  )
}
