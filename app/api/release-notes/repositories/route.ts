import { NextRequest, NextResponse } from "next/server"
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs"
import { cookies } from "next/headers"

export async function GET(request: NextRequest) {
    try {
        const supabase = createRouteHandlerClient({ cookies })
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()

        if (sessionError || !session?.user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        console.log('🔍 Fetching repositories for user:', session.user.id)

        // Use existing GitHub repositories API endpoint
        try {
            const githubResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/github/repositories`, {
                headers: {
                    'Cookie': request.headers.get('cookie') || ''
                }
            })
            
            if (!githubResponse.ok) {
                throw new Error('Failed to fetch from GitHub API')
            }
            
            const githubData = await githubResponse.json()
            
            // Transform GitHub API response to our Repository interface
            const repositories = githubData.repositories.map((repo: any) => ({
                id: repo.id.toString(),
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description,
                provider: 'github',
                url: repo.html_url,
                language: repo.language,
                stars: repo.stargazers_count,
                updated_at: repo.updated_at,
                private: repo.private
            }))
            
            console.log(`✅ Found ${repositories.length} repositories from GitHub`)
            return NextResponse.json(repositories)
            
        } catch (serviceError) {
            console.error('GitHub API error:', serviceError)
            
            // Fallback to mock data for development/demo
            console.log('🔄 Using fallback mock data')
            const mockRepositories = [
                {
                    id: '1',
                    name: 'awesome-project',
                    full_name: 'company/awesome-project',
                    description: 'An awesome project that does amazing things',
                    provider: 'github',
                    url: 'https://github.com/company/awesome-project',
                    language: 'TypeScript',
                    stars: 1250,
                    updated_at: '2024-01-15T10:30:00Z',
                    private: false
                },
                {
                    id: '2',
                    name: 'internal-tool',
                    full_name: 'company/internal-tool',
                    description: 'Internal tool for team productivity',
                    provider: 'github',
                    url: 'https://github.com/company/internal-tool',
                    language: 'Python',
                    stars: 45,
                    updated_at: '2024-01-14T15:20:00Z',
                    private: true
                },
                {
                    id: '3',
                    name: 'mobile-app',
                    full_name: 'company/mobile-app',
                    description: 'Cross-platform mobile application',
                    provider: 'gitlab',
                    url: 'https://gitlab.com/company/mobile-app',
                    language: 'Dart',
                    stars: 320,
                    updated_at: '2024-01-13T09:15:00Z',
                    private: false
                },
                {
                    id: '4',
                    name: 'web-dashboard',
                    full_name: 'company/web-dashboard',
                    description: 'Modern web dashboard for analytics',
                    provider: 'github',
                    url: 'https://github.com/company/web-dashboard',
                    language: 'React',
                    stars: 890,
                    updated_at: '2024-01-12T14:45:00Z',
                    private: false
                },
                {
                    id: '5',
                    name: 'api-service',
                    full_name: 'company/api-service',
                    description: 'RESTful API service with GraphQL support',
                    provider: 'github',
                    url: 'https://github.com/company/api-service',
                    language: 'Node.js',
                    stars: 567,
                    updated_at: '2024-01-11T09:20:00Z',
                    private: true
                }
            ]

            return NextResponse.json(mockRepositories)
        }

    } catch (error) {
        console.error("❌ Repositories API error:", error)
        return NextResponse.json({
            error: "Failed to fetch repositories",
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
    }
}