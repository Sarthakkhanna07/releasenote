'use client'

import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import type { ReleaseNote, Template } from '@/types/database'

interface ReleaseNotesFilters {
  status?: string
  search?: string
  category?: string
  tag?: string
  page: number
  limit: number
}

interface ReleaseNotesState {
  // Data
  releaseNotes: ReleaseNote[]
  selectedNote: ReleaseNote | null
  templates: Template[]
  
  // UI State
  isLoading: boolean
  isCreating: boolean
  isUpdating: boolean
  isPublishing: boolean
  isDeleting: boolean
  error: string | null
  
  // Filters & Pagination
  filters: ReleaseNotesFilters
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  
  // Actions - Data Management
  setReleaseNotes: (notes: ReleaseNote[]) => void
  setSelectedNote: (note: ReleaseNote | null) => void
  addReleaseNote: (note: ReleaseNote) => void
  updateReleaseNote: (id: string, updates: Partial<ReleaseNote>) => void
  removeReleaseNote: (id: string) => void
  
  // Actions - Templates
  setTemplates: (templates: Template[]) => void
  
  // Actions - API Operations
  fetchReleaseNotes: (organizationId: string) => Promise<void>
  createReleaseNote: (data: Partial<ReleaseNote>) => Promise<ReleaseNote | null>
  updateReleaseNoteApi: (id: string, updates: Partial<ReleaseNote>) => Promise<void>
  deleteReleaseNote: (id: string) => Promise<void>
  publishReleaseNote: (id: string) => Promise<void>
  
  // Actions - AI Generation
  generateWithAI: (prompt: string, organizationId: string) => Promise<string | null>
  generateWithTemplate: (templateId: string, data: any) => Promise<string | null>
  improveContent: (content: string, type: string) => Promise<string | null>
  
  // Actions - Templates
  fetchTemplates: (organizationId: string) => Promise<void>
  createTemplate: (data: Partial<Template>) => Promise<Template | null>
  updateTemplate: (id: string, updates: Partial<Template>) => Promise<void>
  deleteTemplate: (id: string) => Promise<void>
  
  // UI Actions
  setLoading: (loading: boolean) => void
  setCreating: (creating: boolean) => void
  setUpdating: (updating: boolean) => void
  setPublishing: (publishing: boolean) => void
  setDeleting: (deleting: boolean) => void
  setError: (error: string | null) => void
  
  // Filter Actions
  setFilters: (filters: Partial<ReleaseNotesFilters>) => void
  setPagination: (pagination: Partial<ReleaseNotesState['pagination']>) => void
  
  // Utility Actions
  clearError: () => void
  reset: () => void
}

const initialState = {
  releaseNotes: [],
  selectedNote: null,
  templates: [],
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  isPublishing: false,
  isDeleting: false,
  error: null,
  filters: {
    page: 1,
    limit: 20
  },
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  }
}

// Utility to generate a slug from a string
function slugify(text: string) {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 64);
}

export const useReleaseNotesStore = create<ReleaseNotesState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // Data actions
        setReleaseNotes: (notes) => 
          set({ releaseNotes: notes }, false, 'setReleaseNotes'),
        
        setSelectedNote: (note) => 
          set({ selectedNote: note }, false, 'setSelectedNote'),
        
        addReleaseNote: (note) => 
          set(
            (state) => ({
              releaseNotes: [note, ...state.releaseNotes],
              pagination: {
                ...state.pagination,
                total: state.pagination.total + 1
              }
            }),
            false,
            'addReleaseNote'
          ),
        
        updateReleaseNote: (id, updates) =>
          set(
            (state) => ({
              releaseNotes: state.releaseNotes.map((note) =>
                note.id === id ? { ...note, ...updates } : note
              ),
              selectedNote: 
                state.selectedNote?.id === id 
                  ? { ...state.selectedNote, ...updates }
                  : state.selectedNote
            }),
            false,
            'updateReleaseNote'
          ),
        
        removeReleaseNote: (id) =>
          set(
            (state) => ({
              releaseNotes: state.releaseNotes.filter((note) => note.id !== id),
              selectedNote: state.selectedNote?.id === id ? null : state.selectedNote,
              pagination: {
                ...state.pagination,
                total: Math.max(0, state.pagination.total - 1)
              }
            }),
            false,
            'removeReleaseNote'
          ),
        
        // Templates data
        setTemplates: (templates) => 
          set({ templates }, false, 'setTemplates'),
        
        // API Operations
        fetchReleaseNotes: async (organizationId: string) => {
          try {
            set({ isLoading: true, error: null }, false, 'fetchReleaseNotesStart')
            const supabase = createClientComponentClient()
            
            const { data, error } = await supabase
              .from('release_notes')
              .select('*')
              .eq('organization_id', organizationId)
              .order('created_at', { ascending: false })
            
            if (error) throw error
            
            set({ 
              releaseNotes: data || [],
              pagination: {
                ...get().pagination,
                total: data?.length || 0,
                totalPages: Math.ceil((data?.length || 0) / get().pagination.limit)
              }
            }, false, 'fetchReleaseNotesSuccess')
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch release notes'
            set({ error: errorMessage }, false, 'fetchReleaseNotesError')
          } finally {
            set({ isLoading: false }, false, 'fetchReleaseNotesComplete')
          }
        },
        
        createReleaseNote: async (data: Partial<ReleaseNote>) => {
          try {
            set({ isCreating: true, error: null }, false, 'createReleaseNoteStart')
            const supabase = createClientComponentClient()

            const baseTitle = data.title || 'Untitled Release Note';
            const baseSlug = slugify(baseTitle) + '-' + Date.now().toString(36);

            // Ensure required fields for insert
            const required: Partial<ReleaseNote> = {
              organization_id: data.organization_id!,
              title: baseTitle,
              slug: data.slug || baseSlug,
              content_markdown: data.content_markdown ?? '',
              status: data.status || 'draft',
              views: typeof data.views === 'number' ? data.views : 0,
            };
            const insertData = { ...required, ...data };

            const { data: newNote, error } = await supabase
              .from('release_notes')
              .insert([insertData])
              .select()
              .single()

            if (error) throw error

            get().addReleaseNote(newNote)
            set({ isCreating: false }, false, 'createReleaseNoteSuccess')
            return newNote
          } catch (error) {
            console.error("Supabase createReleaseNote error:", error);
            const errorMessage = error instanceof Error ? error.message : 'Failed to create release note'
            set({ error: errorMessage, isCreating: false }, false, 'createReleaseNoteError')
            return null
          }
        },
        
        updateReleaseNoteApi: async (id: string, updates: Partial<ReleaseNote>) => {
          try {
            set({ isUpdating: true, error: null }, false, 'updateReleaseNoteStart')
            const supabase = createClientComponentClient()
            
            const { error } = await supabase
              .from('release_notes')
              .update(updates)
              .eq('id', id)
            
            if (error) throw error
            
            get().updateReleaseNote(id, updates)
            set({ isUpdating: false }, false, 'updateReleaseNoteSuccess')
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to update release note'
            set({ error: errorMessage, isUpdating: false }, false, 'updateReleaseNoteError')
          }
        },
        
        deleteReleaseNote: async (id: string) => {
          try {
            set({ isDeleting: true, error: null }, false, 'deleteReleaseNoteStart')
            const supabase = createClientComponentClient()
            
            const { error } = await supabase
              .from('release_notes')
              .delete()
              .eq('id', id)
            
            if (error) throw error
            
            get().removeReleaseNote(id)
            set({ isDeleting: false }, false, 'deleteReleaseNoteSuccess')
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to delete release note'
            set({ error: errorMessage, isDeleting: false }, false, 'deleteReleaseNoteError')
          }
        },
        
        publishReleaseNote: async (id: string, isPublic: boolean = false) => {
          try {
            set({ isPublishing: true, error: null }, false, 'publishReleaseNoteStart')
            const response = await fetch(`/api/release-notes/${id}/publish`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_public: isPublic })
            })
            
            if (!response.ok) throw new Error('Failed to publish release note')
            
            const result = await response.json()
            get().updateReleaseNote(id, { 
              status: 'published', 
              published_at: new Date().toISOString(),
              is_public: isPublic
            })
            set({ isPublishing: false }, false, 'publishReleaseNoteSuccess')
            return result
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to publish release note'
            set({ error: errorMessage, isPublishing: false }, false, 'publishReleaseNoteError')
            throw error
          }
        },
        
        // AI Generation methods
        generateWithAI: async (prompt: string, organizationId: string) => {
          try {
            set({ isLoading: true, error: null }, false, 'generateWithAIStart')
            const response = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt, organizationId })
            })
            
            if (!response.ok) throw new Error('Failed to generate content')
            
            const data = await response.json()
            set({ isLoading: false }, false, 'generateWithAISuccess')
            return data.content
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate content'
            set({ error: errorMessage, isLoading: false }, false, 'generateWithAIError')
            return null
          }
        },
        
        generateWithTemplate: async (templateId: string, data: Record<string, unknown>) => {
          try {
            set({ isLoading: true, error: null }, false, 'generateWithTemplateStart')
            const response = await fetch('/api/ai/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ templateId, data })
            })
            
            if (!response.ok) throw new Error('Failed to generate with template')
            
            const result = await response.json()
            set({ isLoading: false }, false, 'generateWithTemplateSuccess')
            return result.content
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to generate with template'
            set({ error: errorMessage, isLoading: false }, false, 'generateWithTemplateError')
            return null
          }
        },
        
        improveContent: async (content: string, type: string) => {
          try {
            set({ isLoading: true, error: null }, false, 'improveContentStart')
            const response = await fetch('/api/ai/improve-content', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ content, type })
            })
            
            if (!response.ok) throw new Error('Failed to improve content')
            
            const result = await response.json()
            set({ isLoading: false }, false, 'improveContentSuccess')
            return result.content
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to improve content'
            set({ error: errorMessage, isLoading: false }, false, 'improveContentError')
            return null
          }
        },
        
        // Template operations
        fetchTemplates: async (organizationId: string) => {
          try {
            const supabase = createClientComponentClient()
            const { data, error } = await supabase
              .from('templates')
              .select('*')
              .eq('organization_id', organizationId)
              .order('created_at', { ascending: false })
            
            if (error) throw error
            set({ templates: data || [] }, false, 'fetchTemplates')
          } catch (error) {
            console.error('Error fetching templates:', error)
          }
        },
        
        createTemplate: async (data: Partial<Template>) => {
          try {
            const supabase = createClientComponentClient()
            const { data: newTemplate, error } = await supabase
              .from('templates')
              .insert([data])
              .select()
              .single()
            
            if (error) throw error
            
            set((state) => ({
              templates: [newTemplate, ...state.templates]
            }), false, 'createTemplate')
            return newTemplate
          } catch (error) {
            console.error('Error creating template:', error)
            return null
          }
        },
        
        updateTemplate: async (id: string, updates: Partial<Template>) => {
          try {
            const supabase = createClientComponentClient()
            const { error } = await supabase
              .from('templates')
              .update(updates)
              .eq('id', id)
            
            if (error) throw error
            
            set((state) => ({
              templates: state.templates.map((template) =>
                template.id === id ? { ...template, ...updates } : template
              )
            }), false, 'updateTemplate')
          } catch (error) {
            console.error('Error updating template:', error)
          }
        },
        
        deleteTemplate: async (id: string) => {
          try {
            const supabase = createClientComponentClient()
            const { error } = await supabase
              .from('templates')
              .delete()
              .eq('id', id)
            
            if (error) throw error
            
            set((state) => ({
              templates: state.templates.filter((template) => template.id !== id)
            }), false, 'deleteTemplate')
          } catch (error) {
            console.error('Error deleting template:', error)
          }
        },
        
        // UI actions
        setLoading: (loading) => 
          set({ isLoading: loading }, false, 'setLoading'),
        
        setCreating: (creating) => 
          set({ isCreating: creating }, false, 'setCreating'),
        
        setUpdating: (updating) => 
          set({ isUpdating: updating }, false, 'setUpdating'),
        
        setPublishing: (publishing) => 
          set({ isPublishing: publishing }, false, 'setPublishing'),
        
        setDeleting: (deleting) => 
          set({ isDeleting: deleting }, false, 'setDeleting'),
        
        setError: (error) => 
          set({ error }, false, 'setError'),
        
        // Filter actions
        setFilters: (newFilters) =>
          set(
            (state) => ({
              filters: { ...state.filters, ...newFilters }
            }),
            false,
            'setFilters'
          ),
        
        setPagination: (newPagination) =>
          set(
            (state) => ({
              pagination: { ...state.pagination, ...newPagination }
            }),
            false,
            'setPagination'
          ),
        
        // Utility actions
        clearError: () => set({ error: null }, false, 'clearError'),
        
        reset: () => set(initialState, false, 'reset')
      }),
      {
        name: 'release-notes-store',
        partialize: (state) => ({
          releaseNotes: state.releaseNotes,
          selectedNote: state.selectedNote,
          templates: state.templates,
          filters: state.filters,
          pagination: state.pagination
        })
      }
    ),
    {
      name: 'release-notes-store'
    }
  )
)

// Selectors for computed values
export const useReleaseNotesSelectors = () => {
  const store = useReleaseNotesStore()
  
  return {
    // Computed values
    hasReleaseNotes: store.releaseNotes.length > 0,
    isFirstPage: store.pagination.page === 1,
    isLastPage: store.pagination.page >= store.pagination.totalPages,
    totalItems: store.pagination.total,
    
    // Filtered release notes
    filteredNotes: store.releaseNotes.filter((note) => {
      if (store.filters.status && note.status !== store.filters.status) {
        return false
      }
      if (store.filters.search) {
        const search = store.filters.search.toLowerCase()
        return (
          note.title?.toLowerCase().includes(search) ||
          note.content_markdown?.toLowerCase().includes(search)
        )
      }
      // Note: category filtering removed as it's not in the current schema
      return true
    }),
    
    // Status-based filters
    publishedNotes: store.releaseNotes.filter((note) => note.status === 'published'),
    draftNotes: store.releaseNotes.filter((note) => note.status === 'draft'),
    scheduledNotes: store.releaseNotes.filter((note) => note.status === 'scheduled'),
    
    // Loading states
    isAnyLoading: store.isLoading || store.isCreating || store.isUpdating || store.isPublishing || store.isDeleting,
    
    // Templates
    hasTemplates: store.templates.length > 0
  }
}

// Actions hook for easier access
export const useReleaseNotesActions = () => {
  const store = useReleaseNotesStore()
  
  return {
    // Data actions
    fetchReleaseNotes: store.fetchReleaseNotes,
    createReleaseNote: store.createReleaseNote,
    updateReleaseNote: store.updateReleaseNoteApi,
    deleteReleaseNote: store.deleteReleaseNote,
    publishReleaseNote: store.publishReleaseNote,
    
    // AI actions
    generateWithAI: store.generateWithAI,
    generateWithTemplate: store.generateWithTemplate,
    improveContent: store.improveContent,
    
    // Template actions
    fetchTemplates: store.fetchTemplates,
    createTemplate: store.createTemplate,
    updateTemplate: store.updateTemplate,
    deleteTemplate: store.deleteTemplate,
    
    // UI actions
    setSelectedNote: store.setSelectedNote,
    setFilters: store.setFilters,
    setPagination: store.setPagination,
    clearError: store.clearError,
    reset: store.reset
  }
}

// Composite hook for backward compatibility
export const useReleaseNotes = () => {
  const store = useReleaseNotesStore()
  const selectors = useReleaseNotesSelectors()
  const actions = useReleaseNotesActions()
  
  return {
    ...store,
    ...selectors,
    ...actions
  }
}
