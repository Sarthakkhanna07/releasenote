import { LinearReleaseService } from '@/lib/services/linear-release.service'

describe('LinearReleaseService Integration Tests', () => {
  let service: LinearReleaseService

  beforeEach(() => {
    service = new LinearReleaseService('fake-token')
  })

  describe('Input Validation', () => {
    it('should validate basic input correctly', () => {
      const input = {
        teams: ['team-1'],
        projects: ['project-1'],
        dateRange: { from: '2025-01-01', to: '2025-01-31' },
        issueFilters: { labels: ['feature', 'bug'] }
      }

      const result = service.validateInput(input)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid date ranges', () => {
      const input = {
        teams: ['team-1'],
        dateRange: { from: '2025-02-01', to: '2025-01-01' } // Invalid: start after end
      }

      const result = service.validateInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Start date must be before end date')
    })

    it('should detect invalid priority values', () => {
      const input = {
        teams: ['team-1'],
        issueFilters: { minPriority: -1 } // Invalid: negative priority
      }

      const result = service.validateInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Minimum priority must be non-negative')
    })

    it('should detect priority values above Linear limit', () => {
      const input = {
        teams: ['team-1'],
        issueFilters: { minPriority: 6 } // Invalid: above Linear's 0-5 scale
      }

      const result = service.validateInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('Minimum priority must be 5 or less (Linear uses 0-5 scale)')
    })

    it('should require at least one team', () => {
      const input = {
        teams: [],
        projects: ['project-1']
      }

      const result = service.validateInput(input)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContain('At least one team must be selected')
    })
  })

  describe('Prompt Building with Metadata', () => {
    it('should include version and release date in prompts', () => {
      const sections = {
        features: [],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        organization: { meta_description: 'Test company' },
        aiContext: { tone: 'professional', audience: 'mixed' },
        version: '2.1.0',
        releaseDate: '2025-03-15',
        teams: ['team-1'],
        projects: ['project-1']
      })

      expect(result.systemPrompt).toContain('Release version: 2.1.0')
      expect(result.systemPrompt).toContain('Release date: 2025-03-15')
      expect(result.systemPrompt).toContain('Teams in scope: team-1')
      expect(result.systemPrompt).toContain('Projects in scope: project-1')
    })

    it('should include instructions in user prompt', () => {
      const sections = {
        features: [],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        instructions: 'Emphasize security improvements and user experience enhancements'
      })

      expect(result.userPrompt).toContain('Emphasize security improvements and user experience enhancements')
    })

    it('should handle template hints correctly', () => {
      const sections = {
        features: [],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        template: 'Professional business format with executive summary'
      })

      expect(result.systemPrompt).toContain('Template structure')
    })
  })

  describe('Identifier Redaction', () => {
    it('should include identifiers when includeIdentifiers is true', () => {
      const sections = {
        features: [{ id: '1', identifier: 'ENG-123', title: 'New Feature', labels: [] }],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        includeIdentifiers: true
      })

      expect(result.userPrompt).toContain('ENG-123')
    })

    it('should exclude identifiers when includeIdentifiers is false', () => {
      const sections = {
        features: [{ id: '1', identifier: 'ENG-123', title: 'New Feature', labels: [] }],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        includeIdentifiers: false
      })

      expect(result.userPrompt).not.toContain('ENG-123')
    })

    it('should include team names when includeIdentifiers is true', () => {
      const sections = {
        features: [{ 
          id: '1', 
          identifier: 'ENG-123', 
          title: 'New Feature', 
          labels: [],
          team: { id: 'team-1', name: 'Engineering' }
        }],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        includeIdentifiers: true
      })

      expect(result.userPrompt).toContain('Engineering')
    })

    it('should exclude team names when includeIdentifiers is false', () => {
      const sections = {
        features: [{ 
          id: '1', 
          identifier: 'ENG-123', 
          title: 'New Feature', 
          labels: [],
          team: { id: 'team-1', name: 'Engineering' }
        }],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        includeIdentifiers: false
      })

      expect(result.userPrompt).not.toContain('Engineering')
    })
  })

  describe('Edge Cases', () => {
    it('should handle empty sections gracefully', () => {
      const sections = {
        features: [],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections,
        organization: { meta_description: 'Test company' }
      })

      // Check that the prompt contains the expected structure
      expect(result.userPrompt).toContain('TASK: Generate the release notes')
      expect(result.userPrompt).toContain('executive summary')
      expect(result.userPrompt).toContain('Notable Changes')
      expect(result.userPrompt).toContain('Upgrade Notes')
    })

    it('should handle missing optional fields', () => {
      const sections = {
        features: [],
        improvements: [],
        bugfixes: [],
        breaking: []
      }

      const result = service.buildPrompt({
        sections
        // No optional fields provided
      })

      expect(result.systemPrompt).toBeDefined()
      expect(result.userPrompt).toBeDefined()
      expect(result.userPrompt).toContain('TASK: Generate the release notes')
    })
  })
})
