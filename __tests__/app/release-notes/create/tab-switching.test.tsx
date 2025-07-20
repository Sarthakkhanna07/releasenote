import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import CreateReleaseNotePage from '@/app/release-notes/create/page'

// Mock the store and actions
vi.mock('@/lib/store', () => ({
    useReleaseNotesStore: vi.fn(() => ({
        templates: []
    })),
    useReleaseNotesActions: vi.fn(() => ({
        createReleaseNote: vi.fn(),
        generateWithAI: vi.fn(),
        generateWithTemplate: vi.fn(),
        improveContent: vi.fn()
    }))
}))

// Mock the router
vi.mock('next/navigation', () => ({
    useRouter: vi.fn(() => ({
        push: vi.fn()
    }))
}))

// Mock the GitHubReleaseGenerator component
vi.mock('@/components/features/GitHubReleaseGenerator', () => ({
    GitHubReleaseGenerator: () => (
        <div data-testid="github-release-generator">
            <h2>GitHub Release Generator</h2>
            <button>Load My Repositories</button>
            <input placeholder="Repository selection" />
        </div>
    )
}))

// Mock Subframe UI components
vi.mock('@/components/subframe-ui/ui', () => ({
    DefaultPageLayout: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="default-page-layout">{children}</div>
    ),
    Tabs: ({ children }: { children: React.ReactNode }) => (
        <div data-testid="tabs-container" role="tablist">{children}</div>
    )
}))

// Mock Subframe icons
vi.mock('@subframe/core', () => ({
    FeatherGitBranch: () => <div data-testid="git-branch-icon" />,
    FeatherGithub: () => <div data-testid="github-icon" />,
    FeatherTrello: () => <div data-testid="trello-icon" />
}))

// Mock other UI components
vi.mock('@/components/ui/button', () => ({
    Button: ({ children, onClick, ...props }: any) => (
        <button onClick={onClick} {...props}>{children}</button>
    )
}))

vi.mock('@/components/ui/card', () => ({
    Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

vi.mock('@/components/ui/input', () => ({
    Input: (props: any) => <input {...props} />
}))

vi.mock('@/components/ui/textarea', () => ({
    Textarea: (props: any) => <textarea {...props} />
}))

vi.mock('@/components/editor/rich-text-editor', () => ({
    RichTextEditor: ({ content, onChange, placeholder }: any) => (
        <textarea
            data-testid="rich-text-editor"
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
        />
    )
}))

vi.mock('@/components/ui/select', () => ({
    Select: ({ children, value, onValueChange }: any) => (
        <select value={value} onChange={(e) => onValueChange(e.target.value)}>
            {children}
        </select>
    ),
    SelectContent: ({ children }: any) => <>{children}</>,
    SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
    SelectTrigger: ({ children }: any) => <div>{children}</div>,
    SelectValue: () => <span>Select value</span>
}))

vi.mock('@/components/ui/checkbox', () => ({
    Checkbox: ({ checked, onCheckedChange, id }: any) => (
        <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            id={id}
        />
    )
}))

vi.mock('@/components/ui/error-state', () => ({
    ErrorState: ({ message, onRetry }: any) => (
        <div data-testid="error-state">
            <span>{message}</span>
            {onRetry && <button onClick={onRetry}>Retry</button>}
        </div>
    )
}))

vi.mock('@/components/ui/template-selector', () => ({
    TemplateSelector: ({ onTemplateSelect }: any) => (
        <div data-testid="template-selector">
            <button onClick={() => onTemplateSelect('test-template')}>Select Template</button>
        </div>
    )
}))

vi.mock('@/components/ui/content-improver', () => ({
    ContentImprover: ({ content, onContentChange }: any) => (
        <div data-testid="content-improver">
            <textarea
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
            />
        </div>
    )
}))

describe('Tab Switching Functionality', () => {
    beforeEach(() => {
        vi.clearAllMocks()
    })

    it('should render with GitHub tab active by default', () => {
        render(<CreateReleaseNotePage />)

        // Verify GitHub tab is active by default
        expect(screen.getByTestId('github-release-generator')).toBeInTheDocument()

        // Verify Jira content is not visible
        expect(screen.queryByText('Save Draft')).not.toBeInTheDocument()
        expect(screen.queryByText('Publish Now')).not.toBeInTheDocument()
    })

    it('should display GitHub tab content correctly', () => {
        render(<CreateReleaseNotePage />)

        // Verify GitHub tab content is displayed
        expect(screen.getByTestId('github-release-generator')).toBeInTheDocument()
        expect(screen.getByText('GitHub Release Generator')).toBeInTheDocument()
        expect(screen.getByText('Load My Repositories')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Repository selection')).toBeInTheDocument()
    })

    it('should switch to Jira tab when clicked', async () => {
        render(<CreateReleaseNotePage />)

        // Find and click the Jira tab
        const jiraTab = screen.getByText('Jira')
        fireEvent.click(jiraTab)

        // Wait for tab switch
        await waitFor(() => {
            // Verify GitHub content is hidden
            expect(screen.queryByTestId('github-release-generator')).not.toBeInTheDocument()

            // Verify Jira content is displayed
            expect(screen.getByText('Save Draft')).toBeInTheDocument()
            expect(screen.getByText('Publish Now')).toBeInTheDocument()
            expect(screen.getByText('Release Note Details')).toBeInTheDocument()
        })
    })

    it('should display Jira tab content correctly', async () => {
        render(<CreateReleaseNotePage />)

        // Switch to Jira tab
        const jiraTab = screen.getByText('Jira')
        fireEvent.click(jiraTab)

        await waitFor(() => {
            // Verify Jira form elements are present
            expect(screen.getByText('Release Note Details')).toBeInTheDocument()
            expect(screen.getByText('Publishing Options')).toBeInTheDocument()
            expect(screen.getByText('Categories')).toBeInTheDocument()
            expect(screen.getByText('AI Assistant')).toBeInTheDocument()

            // Verify form inputs
            expect(screen.getByPlaceholderText('Enter release note title...')).toBeInTheDocument()
            expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument()

            // Verify action buttons
            expect(screen.getByText('Save Draft')).toBeInTheDocument()
            expect(screen.getByText('Publish Now')).toBeInTheDocument()
        })
    })

    it('should switch back to GitHub tab correctly', async () => {
        render(<CreateReleaseNotePage />)

        // Switch to Jira tab first
        const jiraTab = screen.getByText('Jira')
        fireEvent.click(jiraTab)

        await waitFor(() => {
            expect(screen.getByText('Save Draft')).toBeInTheDocument()
        })

        // Switch back to GitHub tab
        const githubTab = screen.getByText('GitHub')
        fireEvent.click(githubTab)

        await waitFor(() => {
            // Verify GitHub content is displayed again
            expect(screen.getByTestId('github-release-generator')).toBeInTheDocument()
            expect(screen.getByText('GitHub Release Generator')).toBeInTheDocument()

            // Verify Jira content is hidden
            expect(screen.queryByText('Save Draft')).not.toBeInTheDocument()
            expect(screen.queryByText('Publish Now')).not.toBeInTheDocument()
        })
    })

    it('should preserve component state during tab switching', async () => {
        render(<CreateReleaseNotePage />)

        // Switch to Jira tab and enter some data
        const jiraTab = screen.getByText('Jira')
        fireEvent.click(jiraTab)

        await waitFor(() => {
            const titleInput = screen.getByPlaceholderText('Enter release note title...')
            fireEvent.change(titleInput, { target: { value: 'Test Release Title' } })
            expect(titleInput).toHaveValue('Test Release Title')
        })

        // Switch to GitHub tab
        const githubTab = screen.getByText('GitHub')
        fireEvent.click(githubTab)

        await waitFor(() => {
            expect(screen.getByTestId('github-release-generator')).toBeInTheDocument()
        })

        // Switch back to Jira tab
        fireEvent.click(jiraTab)

        await waitFor(() => {
            // Verify the title input still has the entered value
            const titleInput = screen.getByPlaceholderText('Enter release note title...')
            expect(titleInput).toHaveValue('Test Release Title')
        })
    })

    it('should maintain proper tab visual states', () => {
        render(<CreateReleaseNotePage />)

        // Verify tabs container is rendered
        expect(screen.getByTestId('tabs-container')).toBeInTheDocument()

        // Verify both tab options are present
        expect(screen.getByText('GitHub')).toBeInTheDocument()
        expect(screen.getByText('Jira')).toBeInTheDocument()

        // Verify icons are present
        expect(screen.getByTestId('github-icon')).toBeInTheDocument()
        expect(screen.getByTestId('trello-icon')).toBeInTheDocument()
    })

    it('should render header section correctly', () => {
        render(<CreateReleaseNotePage />)

        // Verify header elements
        expect(screen.getByText('Generate Release Notes')).toBeInTheDocument()
        expect(screen.getByText('Transform your code changes into professional release notes')).toBeInTheDocument()
        expect(screen.getByTestId('git-branch-icon')).toBeInTheDocument()
    })

    it('should use DefaultPageLayout wrapper', () => {
        render(<CreateReleaseNotePage />)

        // Verify the page is wrapped with DefaultPageLayout
        expect(screen.getByTestId('default-page-layout')).toBeInTheDocument()
    })

    it('should not break existing functionality in Jira tab', async () => {
        render(<CreateReleaseNotePage />)

        // Switch to Jira tab
        const jiraTab = screen.getByText('Jira')
        fireEvent.click(jiraTab)

        await waitFor(() => {
            // Test form interactions
            const titleInput = screen.getByPlaceholderText('Enter release note title...')
            fireEvent.change(titleInput, { target: { value: 'Test Title' } })
            expect(titleInput).toHaveValue('Test Title')

            // Test rich text editor
            const editor = screen.getByTestId('rich-text-editor')
            fireEvent.change(editor, { target: { value: 'Test content' } })
            expect(editor).toHaveValue('Test content')

            // Test category checkboxes
            const featureCheckbox = screen.getByLabelText('Feature')
            fireEvent.click(featureCheckbox)
            expect(featureCheckbox).toBeChecked()

            // Test buttons are clickable
            const saveDraftButton = screen.getByText('Save Draft')
            const publishButton = screen.getByText('Publish Now')
            expect(saveDraftButton).toBeInTheDocument()
            expect(publishButton).toBeInTheDocument()
        })
    })
})