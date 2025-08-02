'use client'

import React, { useEffect, useRef } from 'react'
import { NodeViewWrapper, NodeViewContent } from '@tiptap/react'
import { CopyIcon, CheckIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface CodeBlockComponentProps {
  node: {
    attrs: {
      language: string | null
    }
    textContent: string
  }
  updateAttributes: (attributes: Record<string, any>) => void
  selected: boolean
}

const SUPPORTED_LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'json', label: 'JSON' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'css', label: 'CSS' },
  { value: 'html', label: 'HTML' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'swift', label: 'Swift' },
  { value: 'kotlin', label: 'Kotlin' },
  { value: 'dart', label: 'Dart' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
  { value: 'csharp', label: 'C#' },
]

export function CodeBlockComponent({ node, updateAttributes, selected }: CodeBlockComponentProps) {
  const { language } = node.attrs
  const [copied, setCopied] = React.useState(false)
  const codeRef = useRef<HTMLElement>(null)

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(node.textContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // Apply syntax highlighting using Prism if available
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Prism && codeRef.current) {
      window.Prism.highlightElement(codeRef.current)
    }
  }, [node.textContent, language])

  return (
    <NodeViewWrapper className={`code-block-wrapper relative group ${selected ? 'ring-2 ring-blue-400 rounded' : ''}`}>
      <div className="relative bg-gray-900 rounded-lg overflow-hidden">
        {/* Header with language selector and copy button */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">Language:</span>
            <select
              value={language || ''}
              onChange={(e) => updateAttributes({ language: e.target.value || null })}
              className="text-xs bg-gray-700 text-white border border-gray-600 rounded px-2 py-1 outline-none focus:border-blue-400"
            >
              <option value="">Plain text</option>
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className="h-6 px-2 text-gray-400 hover:text-white hover:bg-gray-700 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            {copied ? (
              <CheckIcon className="w-3 h-3" />
            ) : (
              <CopyIcon className="w-3 h-3" />
            )}
          </Button>
        </div>

        {/* Code content */}
        <div className="relative">
          <NodeViewContent
            as="pre"
            className="overflow-x-auto p-4 text-sm leading-relaxed bg-gray-900 text-gray-100 font-mono"
          >
            <code
              ref={codeRef}
              className={language ? `language-${language}` : ''}
            />
          </NodeViewContent>
        </div>
      </div>
    </NodeViewWrapper>
  )
}

// Extend window type for Prism
declare global {
  interface Window {
    Prism?: {
      highlightElement: (element: HTMLElement) => void
      highlightAll: () => void
      manual?: boolean
    }
  }
}