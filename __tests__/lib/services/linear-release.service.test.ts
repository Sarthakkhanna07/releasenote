import { LinearReleaseService, type LinearIssueLite } from '@/lib/services/linear-release.service'

// Mock linear client used by the service
jest.mock('@/lib/integrations/linear-client', () => ({
  linearAPI: {
    getIssues: jest.fn(async (_token: string, { first, after }: any) => {
      // Return two pages of fake issues when no 'after', then stop
      const page1 = {
        nodes: [
          { id: '1', identifier: 'ENG-1', title: 'Add feature A', labels: { nodes: [{ name: 'feature' }] }, state: { name: 'Done', type: 'completed' }, team: { id: 't1', name: 'Team A' }, project: { id: 'p1', name: 'Proj' }, priority: 2, completedAt: '2025-08-01' },
          { id: '2', identifier: 'ENG-2', title: 'Fix bug B', labels: { nodes: [{ name: 'bug' }] }, state: { name: 'Done', type: 'completed' }, team: { id: 't1', name: 'Team A' }, project: { id: 'p1', name: 'Proj' }, priority: 1, completedAt: '2025-08-01' }
        ],
        pageInfo: { hasNextPage: true, endCursor: 'cursor-1' }
      }
      const page2 = {
        nodes: [
          { id: '3', identifier: 'ENG-3', title: 'Improve C', labels: { nodes: [{ name: 'enhancement' }] }, state: { name: 'Done', type: 'completed' }, team: { id: 't1', name: 'Team A' }, project: { id: 'p2', name: 'Proj2' }, priority: 3, completedAt: '2025-08-01' }
        ],
        pageInfo: { hasNextPage: false, endCursor: null }
      }
      return after ? page2 : page1
    })
  }
}))

describe('LinearReleaseService', () => {
  const svc = new LinearReleaseService('fake-token')

  it('aggregates with pagination and filters by project/date/labels/priority', async () => {
    const { issues, totalIssues } = await svc.aggregate({
      teams: ['t1'],
      projects: ['p1'],
      dateRange: { from: undefined, to: undefined },
      issueFilters: { labels: ['feature', 'bug'], minPriority: 0 }
    })

    // Should filter to only p1 projects and feature/bug labels
    // Note: Our mock returns 3 issues total, but only 2 match the p1 project filter
    expect(totalIssues).toBe(2)
    expect(issues.map(i => i.identifier)).toEqual(['ENG-1', 'ENG-2'])
  })

  it('categorizes into sections', () => {
    const categorized = svc.categorize([
      { id: '1', identifier: 'ENG-1', title: 'Add feature A', labels: ['feature'] } as LinearIssueLite,
      { id: '2', identifier: 'ENG-2', title: 'Fix bug B', labels: ['bug'] } as LinearIssueLite,
      { id: '3', identifier: 'ENG-3', title: 'Improve C', labels: ['enhancement'] } as LinearIssueLite,
      { id: '4', identifier: 'ENG-4', title: 'Breaking change', labels: ['breaking'] } as LinearIssueLite
    ])

    // Check that each issue is categorized correctly based on labels
    // Priority order: breaking > bug > feature > improvements
    // Note: 'enhancement' matches the feature regex pattern, so it goes to features
    expect(categorized.features.length).toBe(2) // 'feature' + 'enhancement' labels
    expect(categorized.bugfixes.length).toBe(1) // 'bug' label  
    expect(categorized.improvements.length).toBe(0) // 'enhancement' goes to features
    expect(categorized.breaking.length).toBe(1) // 'breaking' label
  })

  it('builds a professional prompt with context and optional template', () => {
    const prompt = svc.buildPrompt({
      sections: { features: [], improvements: [], bugfixes: [], breaking: [] },
      organization: { meta_description: 'A dev tools company', settings: { industry: 'SaaS' } },
      aiContext: { system_prompt: 'Use British English.', audience: 'mixed', tone: 'professional', output_format: 'markdown' },
      version: '1.2.3',
      releaseDate: '2025-08-18',
      instructions: 'Emphasize UX improvements.',
      template: '# Title\n## Section',
      dateRange: { from: '2025-07-01', to: '2025-08-01' },
      teams: ['t1'],
      projects: ['p1']
    })

    expect(prompt.systemPrompt).toContain('Role: You are an experienced product technical writer')
    expect(prompt.systemPrompt).toContain('A dev tools company')
    expect(prompt.systemPrompt).toContain('Release Version: 1.2.3')
    expect(prompt.systemPrompt).toContain('Template structure')
  })
})
