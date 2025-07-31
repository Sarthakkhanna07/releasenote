'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Link from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import Table from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import Highlight from '@tiptap/extension-highlight'
import TextStyle from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import { Callout } from './extensions/callout'
import { CodeBlockEnhanced } from './extensions/code-block-enhanced'
import { Button } from '@/components/ui/button'
import { 
  BoldIcon, 
  ItalicIcon, 
  UnderlineIcon, 
  StrikethroughIcon,
  ListIcon,
  ListOrderedIcon,
  ListChecksIcon,
  QuoteIcon,
  CodeIcon,
  UndoIcon,
  RedoIcon,
  LinkIcon,
  ImageIcon,
  TableIcon,
  Heading1Icon,
  Heading2Icon,
  Heading3Icon,
  HighlighterIcon,
  WandIcon,
  InfoIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  LightbulbIcon,
  AlignLeftIcon,
  AlignCenterIcon,
  AlignRightIcon,
  AlignJustifyIcon
} from 'lucide-react'
import { useState, useCallback, useEffect, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

interface RichTextEditorProps {
  content?: string
  onChange?: (content: string) => void
  placeholder?: string
  className?: string
  enableAI?: boolean
  onAIGenerate?: () => void
}

export function RichTextEditor({ 
  content = '', 
  onChange, 
  placeholder = 'Start writing your release notes...', 
  className = '',
  enableAI = true,
  onAIGenerate
}: RichTextEditorProps) {
  // Add custom styles for scrollbar
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .tiptap-editor-scroll::-webkit-scrollbar {
        width: 8px;
      }
      .tiptap-editor-scroll::-webkit-scrollbar-track {
        background: #f1f1f1;
        border-radius: 4px;
      }
      .tiptap-editor-scroll::-webkit-scrollbar-thumb {
        background: #c1c1c1;
        border-radius: 4px;
      }
      .tiptap-editor-scroll::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8;
      }
    `
    document.head.appendChild(style)
    return () => {
      document.head.removeChild(style)
    }
  }, [])
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [linkUrl, setLinkUrl] = useState('')
  const [uploading, setUploading] = useState(false)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [selectedColor, setSelectedColor] = useState('#000000')
  const colorPickerRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false)
      }
    }

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showColorPicker])

  const editor = useEditor({
    immediatelyRender: false, // Fix SSR hydration issue
    extensions: [
      StarterKit.configure({
        // Disable default code block to use our enhanced version
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-[#7F56D9] underline hover:text-[#6941C6]',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg',
        },
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
      Highlight.configure({
        HTMLAttributes: {
          class: 'bg-yellow-200 rounded px-1',
        },
      }),
      TextStyle,
      Color,
      Underline,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: false,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),
      Callout,
      CodeBlockEnhanced,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none min-h-[300px] p-4',
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML())
    },
  })


const addImage = useCallback(() => {
  if (!editor) return;
  if (!supabase) {
    alert('Supabase client not initialized. Please check your environment variables.');
    return;
  }
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.click();
  input.onchange = async () => {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];
    setUploading(true);
    try {
      const timestamp = Date.now();
      const fileName = `editor_${timestamp}_${file.name}`;
      const filePath = `${fileName}`;
      const { data, error: uploadError } = await supabase.storage
        .from('release-note-images')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage
        .from('release-note-images')
        .getPublicUrl(filePath);
      if (!urlData || !urlData.publicUrl) {
        throw new Error('Could not get public URL for uploaded image.');
      }
      editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
    } catch (error) {
      alert('Image upload failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };
}, [editor, supabase]);

  const setLink = useCallback(() => {
    const previousUrl = editor?.getAttributes('link').href
    const url = window.prompt('Enter URL:', previousUrl)

    if (url === null) {
      return
    }

    if (url === '') {
      editor?.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }

    editor?.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }, [editor])

  const addTable = useCallback(() => {
    editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }, [editor])

  const addCallout = useCallback((type: 'info' | 'warning' | 'success' | 'error' | 'tip' = 'info') => {
    editor?.chain().focus().setCallout({ type }).run()
  }, [editor])

  const setTextColor = useCallback((color: string) => {
    editor?.chain().focus().setColor(color).run()
    setSelectedColor(color)
    setShowColorPicker(false)
  }, [editor])

  const addCodeBlock = useCallback(() => {
    editor?.chain().focus().toggleCodeBlock().run()
  }, [editor])

  if (!editor) {
    return null
  }

  return (
    <div className={`border border-[#d0d5dd] rounded-lg overflow-hidden ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-[#e4e7ec] p-3 bg-white flex flex-wrap gap-1">
        {/* Text Formatting */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().toggleBold()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('bold') ? 'bg-gray-200' : ''}`}
            title="Bold (Ctrl+B)"
          >
            <BoldIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().toggleItalic()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('italic') ? 'bg-gray-200' : ''}`}
            title="Italic (Ctrl+I)"
          >
            <ItalicIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().toggleUnderline()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('underline') ? 'bg-gray-200' : ''}`}
            title="Underline (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().toggleStrike()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('strike') ? 'bg-gray-200' : ''}`}
            title="Strikethrough"
          >
            <StrikethroughIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHighlight().run()}
            disabled={!editor.can().toggleHighlight()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('highlight') ? 'bg-gray-200' : ''}`}
            title="Highlight"
          >
            <HighlighterIcon className="h-4 w-4" />
          </Button>
          <div className="relative" ref={colorPickerRef}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100"
              title="Text Color"
            >
              <div className="flex items-center gap-1">
                <div 
                  className="w-3 h-3 rounded border border-gray-300" 
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-xs">A</span>
              </div>
            </Button>
            {showColorPicker && (
              <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[280px]">
                <div className="mb-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Colors</h4>
                  <div className="grid grid-cols-8 gap-1.5">
                    {[
                      '#000000', '#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                      '#ffa500', '#800080', '#008000', '#ffc0cb', '#a52a2a', '#808080', '#000080', '#800000',
                      '#ff6347', '#32cd32', '#4169e1', '#ff1493', '#00ced1', '#ffd700', '#ff4500', '#228b22',
                      '#1e90ff', '#ff69b4', '#20b2aa', '#daa520', '#dc143c', '#4b0082', '#c71585', '#48d1cc'
                    ].map((color) => (
                      <button
                        key={color}
                        onClick={() => setTextColor(color)}
                        className={`w-7 h-7 rounded-md border-2 transition-all duration-200 hover:scale-110 hover:shadow-md ${
                          selectedColor === color ? 'border-gray-400 shadow-md' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Custom Color</h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedColor}
                      onChange={(e) => setTextColor(e.target.value)}
                      className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 bg-white"
                      placeholder="#000000"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Headings */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={!editor.can().toggleHeading({ level: 1 })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('heading', { level: 1 }) ? 'bg-gray-200' : ''}`}
            title="Heading 1"
          >
            <Heading1Icon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor.can().toggleHeading({ level: 2 })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('heading', { level: 2 }) ? 'bg-gray-200' : ''}`}
            title="Heading 2"
          >
            <Heading2Icon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor.can().toggleHeading({ level: 3 })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('heading', { level: 3 }) ? 'bg-gray-200' : ''}`}
            title="Heading 3"
          >
            <Heading3Icon className="h-4 w-4" />
          </Button>
        </div>

        {/* Lists */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={!editor.can().toggleBulletList()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('bulletList') ? 'bg-gray-200' : ''}`}
            title="Bullet List"
          >
            <ListIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={!editor.can().toggleOrderedList()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('orderedList') ? 'bg-gray-200' : ''}`}
            title="Numbered List"
          >
            <ListOrderedIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleTaskList().run()}
            disabled={!editor.can().toggleTaskList()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('taskList') ? 'bg-gray-200' : ''}`}
            title="Task List"
          >
            <ListChecksIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Text Alignment */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            disabled={!editor.can().setTextAlign('left')}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200' : ''}`}
            title="Align Left"
          >
            <AlignLeftIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            disabled={!editor.can().setTextAlign('center')}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200' : ''}`}
            title="Align Center"
          >
            <AlignCenterIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            disabled={!editor.can().setTextAlign('right')}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200' : ''}`}
            title="Align Right"
          >
            <AlignRightIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            disabled={!editor.can().setTextAlign('justify')}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200' : ''}`}
            title="Justify Text"
          >
            <AlignJustifyIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Other Formatting */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={!editor.can().toggleBlockquote()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('blockquote') ? 'bg-gray-200' : ''}`}
            title="Blockquote"
          >
            <QuoteIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addCodeBlock}
            disabled={!editor.can().toggleCodeBlock()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('codeBlockEnhanced') ? 'bg-gray-200' : ''}`}
            title="Code Block"
          >
            <CodeIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Callouts */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addCallout('info')}
            disabled={!editor.can().setCallout({ type: 'info' })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('callout', { type: 'info' }) ? 'bg-blue-100' : ''}`}
            title="Add Info Callout"
          >
            <InfoIcon className="h-4 w-4 text-blue-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addCallout('warning')}
            disabled={!editor.can().setCallout({ type: 'warning' })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('callout', { type: 'warning' }) ? 'bg-yellow-100' : ''}`}
            title="Add Warning Callout"
          >
            <AlertTriangleIcon className="h-4 w-4 text-yellow-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addCallout('success')}
            disabled={!editor.can().setCallout({ type: 'success' })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('callout', { type: 'success' }) ? 'bg-green-100' : ''}`}
            title="Add Success Callout"
          >
            <CheckCircleIcon className="h-4 w-4 text-green-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addCallout('error')}
            disabled={!editor.can().setCallout({ type: 'error' })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('callout', { type: 'error' }) ? 'bg-red-100' : ''}`}
            title="Add Error Callout"
          >
            <XCircleIcon className="h-4 w-4 text-red-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => addCallout('tip')}
            disabled={!editor.can().setCallout({ type: 'tip' })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('callout', { type: 'tip' }) ? 'bg-purple-100' : ''}`}
            title="Add Tip Callout"
          >
            <LightbulbIcon className="h-4 w-4 text-purple-600" />
          </Button>
        </div>

        {/* Media & Links */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={setLink}
            disabled={!editor.can().setLink({ href: '' })}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100 ${editor.isActive('link') ? 'bg-gray-200' : ''}`}
            title="Insert Link"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addImage}
            disabled={!editor.can().setImage({ src: '' })}
            title="Insert Image"
          >
            <ImageIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={addTable}
            disabled={!editor.can().insertTable({ rows: 3, cols: 3, withHeaderRow: true })}
            title="Insert Table"
          >
            <TableIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Undo/Redo */}
        <div className="flex gap-1 mr-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100`}
            title="Undo (Ctrl+Z)"
          >
            <UndoIcon className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className={`opacity-100 text-black disabled:opacity-60 disabled:text-gray-400 disabled:bg-gray-100`}
            title="Redo (Ctrl+Y)"
          >
            <RedoIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* AI Assistant */}
        {enableAI && (
          <div className="flex gap-1 ml-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={onAIGenerate}
              className="text-[#7F56D9] border-[#7F56D9] hover:bg-[#7F56D9] hover:text-white"
            >
              <WandIcon className="h-4 w-4 mr-1" />
              AI Assist
            </Button>
          </div>
        )}
      </div>

      {/* Editor Content */}
      <div className="min-h-[300px] max-h-[70vh] overflow-y-auto tiptap-editor-scroll">
        <EditorContent 
          editor={editor} 
          className="focus-within:outline-none min-h-[300px] p-4 bg-white text-black"
        />
        
        {/* Placeholder when empty */}
        {editor.isEmpty && (
          <div className="absolute top-4 left-4 text-gray-400 pointer-events-none">
            {placeholder}
          </div>
        )}
      </div>
    </div>
  )
}