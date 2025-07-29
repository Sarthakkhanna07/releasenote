'use client'

import React, { useMemo, useRef, useCallback, forwardRef } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
// Dynamically import react-quill to avoid SSR issues
import dynamic from 'next/dynamic'
import 'react-quill/dist/quill.snow.css' // Import Quill styles
import type Quill from 'quill' // Import Quill type
import type ReactQuillType from 'react-quill' // Import ReactQuill type
import { RichTextEditor } from '@/components/editor/rich-text-editor';

// Dynamically import ReactQuill, disable SSR  
const ReactQuill = dynamic(() => import('react-quill'), { 
  ssr: false,
  loading: () => <div>Loading editor...</div>
});

interface ReleaseNoteEditorProps {
  value: string;
  onChange: (content: string) => void;
  placeholder?: string;
}

const IMAGE_BUCKET = 'release-note-images' // Match your Supabase bucket name

export default function ReleaseNoteEditor({ value, onChange, placeholder }: ReleaseNoteEditorProps) {
  return (
    <RichTextEditor
      content={value}
      onChange={onChange}
      placeholder={placeholder || 'Write your release notes here...'}
    />
  );
} 