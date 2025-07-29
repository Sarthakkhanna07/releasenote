"use client";

import React, { useState, useRef } from "react";
import { DialogLayout } from "@/components/subframe-ui/ui/layouts/DialogLayout";
import { IconButton } from "@/components/subframe-ui/ui/components/IconButton";
import { FeatherX, FeatherPlus, FeatherTrash2, FeatherGripVertical } from "@subframe/core";
import { TextField } from "@/components/subframe-ui/ui/components/TextField";
import { Select } from "@/components/subframe-ui/ui/components/Select";
import { TextArea } from "@/components/subframe-ui/ui/components/TextArea";
import { Button } from "@/components/subframe-ui/ui/components/Button";
import { useAuthStore } from "@/lib/store";
import { useReleaseNotesActions } from "@/lib/store/use-release-notes";

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker: React.FC<EmojiPickerProps> = ({ onSelect, onClose }) => (
  <div className="absolute z-50 bg-white border rounded-lg shadow-lg p-2 mt-1 right-0 min-w-[200px]">
    <div className="grid grid-cols-5 gap-1">
      {["📝", "🚀", "📢", "💡", "🐞", "✨", "🔧", "📦", "🎉", "⚡", "📊", "🎯", "🔒", "⚙️", "📧", "🌟", "🎨", "📈", "🔥", "💎"].map(emoji => (
        <button
          key={emoji}
          className="text-xl p-2 hover:bg-gray-100 rounded transition-colors w-8 h-8 flex items-center justify-center"
          onClick={() => { onSelect(emoji); onClose(); }}
          type="button"
        >
          {emoji}
        </button>
      ))}
    </div>
  </div>
);

interface TemplateSection {
  id: string;
  name: string;
  type: 'features' | 'improvements' | 'bugfixes' | 'breaking' | 'security' | 'technical' | 'contact' | 'custom';
  required: boolean;
  prompt: string;
  example: string;
}

interface NewTemplateModalProps {
  open: boolean;
  onClose: () => void;
  initialData?: any;
}

const SECTION_TYPES = [
  { value: 'features', label: 'New Features', icon: '🚀' },
  { value: 'improvements', label: 'Improvements', icon: '✨' },
  { value: 'bugfixes', label: 'Bug Fixes', icon: '🐛' },
  { value: 'breaking', label: 'Breaking Changes', icon: '⚠️' },
  { value: 'security', label: 'Security Updates', icon: '🔒' },
  { value: 'technical', label: 'Technical Notes', icon: '⚙️' },
  { value: 'contact', label: 'Contact Info', icon: '📧' },
  { value: 'custom', label: 'Custom Section', icon: '📝' }
];



function NewTemplateModal({ open, onClose, initialData }: NewTemplateModalProps) {
  // Parse existing sections from content if editing
  const parseInitialSections = () => {
    // Handle Smart Import data (sections array directly)
    if (initialData?.sections && Array.isArray(initialData.sections)) {
      console.log('🔧 NewTemplateModal: Using Smart Import sections:', initialData.sections);
      return initialData.sections;
    }

    // Handle existing template data (content as JSON string)
    if (initialData?.content) {
      try {
        const parsed = JSON.parse(initialData.content);
        return parsed.sections || [];
      } catch {
        return [];
      }
    }

    // Default sections
    return [
      {
        id: '1',
        name: 'What\'s New',
        type: 'features',
        required: true,
        prompt: 'List new features focusing on user benefits and value',
        example: '• New dashboard with real-time analytics\n• Mobile app now supports offline mode'
      },
      {
        id: '2',
        name: 'Improvements',
        type: 'improvements',
        required: false,
        prompt: 'Describe enhancements to existing features',
        example: '• 40% faster page load times\n• Improved search accuracy'
      },
      {
        id: '3',
        name: 'Bug Fixes',
        type: 'bugfixes',
        required: false,
        prompt: 'List resolved issues and fixes',
        example: '• Fixed login issues on mobile devices\n• Resolved email notification delays'
      }
    ];
  };

  // State - only what's needed for AI
  const [name, setName] = useState(initialData?.name || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [icon, setIcon] = useState(initialData?.icon || "📝");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [category, setCategory] = useState(initialData?.category || "user-focused");
  const [sections, setSections] = useState<TemplateSection[]>(parseInitialSections());

  // AI Context Settings - Use Smart Import data if available
  const [useOrgAIContext, setUseOrgAIContext] = useState(initialData?.uses_org_ai_context ?? true);
  const [customSystemPrompt, setCustomSystemPrompt] = useState(initialData?.system_prompt || "");
  const [customTone, setCustomTone] = useState(initialData?.tone || "professional");
  const [customAudience, setCustomAudience] = useState(initialData?.target_audience || "mixed");
  const [customOutputFormat, setCustomOutputFormat] = useState(initialData?.output_format || "markdown");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});

  const organization = useAuthStore(state => state.organization);
  const { createTemplate, updateTemplate } = useReleaseNotesActions();

  // Field-level validation
  const validateField = (field: string, value: string, sectionId?: string) => {
    const key = sectionId ? `${sectionId}-${field}` : field;
    const newErrors = { ...fieldErrors };

    if (!value.trim()) {
      newErrors[key] = "This field is required";
    } else {
      delete newErrors[key];
    }

    setFieldErrors(newErrors);
    return !newErrors[key];
  };

  const validateAllFields = () => {
    const newErrors: { [key: string]: string } = {};

    // Validate basic fields
    if (!name.trim()) newErrors.name = "Template name is required";
    if (!description.trim()) newErrors.description = "Description is required";

    // Validate sections
    sections.forEach(section => {
      if (!section.name.trim()) newErrors[`${section.id}-name`] = "Section name is required";
      if (!section.prompt.trim()) newErrors[`${section.id}-prompt`] = "AI prompt is required";
      if (!section.example.trim()) newErrors[`${section.id}-example`] = "Example content is required";
    });

    setFieldErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValid = name.trim() && description.trim() && sections.length > 0;

  // Section management
  const addSection = () => {
    const newSection: TemplateSection = {
      id: Date.now().toString(),
      name: '',
      type: 'custom',
      required: false,
      prompt: '',
      example: ''
    };
    setSections([...sections, newSection]);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id: string, updates: Partial<TemplateSection>) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  // Generate AI prompts from sections
  const generateSystemPrompt = () => {
    if (useOrgAIContext) {
      // Use organization AI context - will be filled from org settings
      const sectionDescriptions = sections.map(s =>
        `- ${s.name} (${s.type}): ${s.prompt}`
      ).join('\n');

      return `Structure your response with these sections:
${sectionDescriptions}

For each section, follow the specific prompts defined above.`;
    } else {
      // Use custom AI context
      const sectionDescriptions = sections.map(s =>
        `- ${s.name} (${s.type}): ${s.prompt}`
      ).join('\n');

      const basePrompt = customSystemPrompt || `You are an expert technical writer creating release notes for ${customAudience} audience with a ${customTone} tone.`;

      return `${basePrompt}

Structure your response with these sections:
${sectionDescriptions}

Guidelines:
- Write clearly and professionally
- Focus on user value and benefits
- Use appropriate technical detail for the audience`;
    }
  };

  const generateUserPrompt = () => {
    const requiredSections = sections.filter(s => s.required).map(s => s.name);
    const optionalSections = sections.filter(s => !s.required).map(s => s.name);

    return `Create release notes for version {version} based on these changes:
{changes}

Required sections: ${requiredSections.join(', ')}
Optional sections (include if relevant): ${optionalSections.join(', ')}

For each section, follow the specific prompts defined in the template.`;
  };

  const generateExampleOutput = () => {
    return sections.map(section => {
      const sectionType = SECTION_TYPES.find(t => t.value === section.type);
      return `## ${sectionType?.icon} ${section.name}\n\n${section.example}`;
    }).join('\n\n');
  };

  // Save handler
  const handleSave = async () => {
    // Validate all fields and show field-level errors
    if (!validateAllFields()) {
      return; // Don't show global error, field errors will be shown
    }

    const orgId = organization?.id;
    if (!orgId) {
      setError("No organization found. Please contact support or re-login.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const fields = {
        name,
        description,
        icon,
        category,
        uses_org_ai_context: useOrgAIContext,
        tone: useOrgAIContext ? 'organization' : customTone,
        target_audience: useOrgAIContext ? 'organization' : customAudience,
        output_format: useOrgAIContext ? 'markdown' : customOutputFormat,
        system_prompt: generateSystemPrompt(),
        user_prompt_template: generateUserPrompt(),
        example_output: generateExampleOutput(),
        organization_id: orgId,
        content: JSON.stringify({
          sections,
          useOrgAIContext,
          customSystemPrompt: useOrgAIContext ? null : customSystemPrompt,
          customTone: useOrgAIContext ? null : customTone,
          customAudience: useOrgAIContext ? null : customAudience,
          customOutputFormat: useOrgAIContext ? null : customOutputFormat
        }),
      };

      if (initialData && initialData.id) {
        await updateTemplate(initialData.id, fields);
      } else {
        await createTemplate(fields);
      }

      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose && onClose();
      }, 800);
    } catch (e) {
      setError("Failed to save template.");
    } finally {
      setLoading(false);
    }
  };

  // Cancel handler
  const handleCancel = () => {
    onClose && onClose();
  };

  // Focus first field
  const nameRef = useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (open && nameRef.current) {
      nameRef.current.focus();
    }
  }, [open]);

  return (
    <DialogLayout open={open} onOpenChange={onClose}>
      <div className="flex h-full w-full flex-col items-start gap-6 bg-default-background px-8 py-8 overflow-y-auto" style={{ width: '630px', maxWidth: '630px' }}>
        {/* Header */}
        <div className="flex w-full items-center justify-between">
          <span className="text-heading-3 font-heading-3 text-default-font">
            {initialData ? "Edit Template" : "Create Release Note Template"}
          </span>
          <IconButton
            icon={<FeatherX />}
            onClick={handleCancel}
            aria-label="Close"
          />
        </div>

        {/* Basic Info */}
        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col">
            <TextField
              className="h-auto w-full"
              label="Template Name"
              helpText="Give your template a descriptive name"
            >
              <TextField.Input
                ref={nameRef}
                placeholder="e.g., User-Focused Product Updates"
                value={name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  setName(e.target.value);
                  validateField('name', e.target.value);
                }}
                className={fieldErrors.name ? 'border-red-500' : ''}
              />
            </TextField>
            {fieldErrors.name && (
              <span className="text-red-500 text-xs mt-1">{fieldErrors.name}</span>
            )}
          </div>

          <div className="flex flex-col">
            <TextArea
              className="h-auto w-full"
              label="Description"
              helpText="Explain when and how to use this template"
            >
              <TextArea.Input
                className={`min-h-[80px] ${fieldErrors.description ? 'border-red-500' : ''}`}
                placeholder="This template focuses on user benefits and clear value propositions, making it easy for users to understand what's new and how it affects them..."
                value={description}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => {
                  setDescription(e.target.value);
                  validateField('description', e.target.value);
                }}
              />
            </TextArea>
            {fieldErrors.description && (
              <span className="text-red-500 text-xs mt-1">{fieldErrors.description}</span>
            )}
          </div>

          {/* Template Icon & Category */}
          <div className="flex gap-3 items-start">
            <div className="flex flex-col relative">
              <label className="text-caption-bold font-caption-bold text-default-font mb-2">
                Template Icon
              </label>
              <button
                type="button"
                className="text-2xl p-2 border rounded hover:bg-gray-100 w-12 h-12 flex items-center justify-center transition-colors"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              >
                {icon}
              </button>
              <span className="text-xs text-neutral-500 mt-2 text-center">
                Click to change
              </span>
              {showEmojiPicker && (
                <EmojiPicker
                  onSelect={setIcon}
                  onClose={() => setShowEmojiPicker(false)}
                />
              )}
            </div>

            <div className="flex flex-col flex-1">
              <Select
                className="h-auto w-full"
                label="Template Category"
                placeholder="Select category"
                helpText="Choose the style that best fits your template"
                value={category}
                onValueChange={setCategory}
              >
                <Select.Item value="marketing">📢 Marketing Team</Select.Item>
                <Select.Item value="technical">⚙️ Technical/Developer</Select.Item>
                <Select.Item value="user-focused">👥 User-Focused</Select.Item>
                <Select.Item value="conversational">💬 Conversational</Select.Item>
                <Select.Item value="executive">📊 Executive Summary</Select.Item>
                <Select.Item value="changelog">📝 Changelog</Select.Item>
                <Select.Item value="product">🚀 Product Updates</Select.Item>
                <Select.Item value="security">🔒 Security Updates</Select.Item>
                <Select.Item value="api">🔌 API Changes</Select.Item>
                <Select.Item value="mobile">📱 Mobile App</Select.Item>
                <Select.Item value="enterprise">🏢 Enterprise</Select.Item>
                <Select.Item value="startup">⚡ Startup/Agile</Select.Item>
                <Select.Item value="minimal">✨ Minimal</Select.Item>
                <Select.Item value="detailed">📋 Detailed</Select.Item>
                <Select.Item value="custom">🎨 Custom</Select.Item>
              </Select>
            </div>
          </div>
        </div>

        {/* AI Context Settings */}
        <div className="flex w-full flex-col gap-4">
          <span className="text-heading-3 font-heading-3 text-default-font">
            AI Context Settings
          </span>

          <div className="flex flex-col gap-4">
            <div className="flex gap-3">
              <input
                type="radio"
                name="aiContext"
                checked={useOrgAIContext}
                onChange={() => setUseOrgAIContext(true)}
                className="mt-1.5 flex-shrink-0"
              />
              <label className="flex flex-col cursor-pointer flex-1" onClick={() => setUseOrgAIContext(true)}>
                <span className="text-sm font-medium">Use organization AI context settings</span>
                <span className="text-xs text-neutral-500 mt-1">
                  Use the same AI settings configured for your organization
                </span>
              </label>
            </div>

            <div className="flex gap-3">
              <input
                type="radio"
                name="aiContext"
                checked={!useOrgAIContext}
                onChange={() => setUseOrgAIContext(false)}
                className="mt-1.5 flex-shrink-0"
              />
              <label className="flex flex-col cursor-pointer flex-1" onClick={() => setUseOrgAIContext(false)}>
                <span className="text-sm font-medium">Use custom AI context settings for this template</span>
                <span className="text-xs text-neutral-500 mt-1">
                  Configure specific AI settings that will only be used for this template
                </span>
              </label>
            </div>
          </div>

          {/* Custom AI Context Settings */}
          {!useOrgAIContext && (
            <div className="border rounded-lg p-4 bg-neutral-50 mt-4">
              <div className="flex flex-col gap-4">
                <TextArea
                  className="h-auto w-full"
                  label="System Prompt"
                  helpText="Define the AI's role and behavior for this template"
                >
                  <TextArea.Input
                    className="min-h-[100px]"
                    placeholder="You are an expert technical writer creating release notes. Your writing should be clear, professional, and focused on user value..."
                    value={customSystemPrompt}
                    onChange={(e) => setCustomSystemPrompt(e.target.value)}
                  />
                </TextArea>

                <div className="grid grid-cols-3 gap-3">
                  <Select
                    className="h-auto"
                    label="Tone"
                    placeholder="Select tone"
                    value={customTone}
                    onValueChange={setCustomTone}
                  >
                    <Select.Item value="professional">Professional</Select.Item>
                    <Select.Item value="casual">Casual</Select.Item>
                    <Select.Item value="technical">Technical</Select.Item>
                    <Select.Item value="enthusiastic">Enthusiastic</Select.Item>
                    <Select.Item value="formal">Formal</Select.Item>
                  </Select>

                  <Select
                    className="h-auto"
                    label="Audience"
                    placeholder="Select audience"
                    value={customAudience}
                    onValueChange={setCustomAudience}
                  >
                    <Select.Item value="developers">Developers</Select.Item>
                    <Select.Item value="business">Business Users</Select.Item>
                    <Select.Item value="users">End Users</Select.Item>
                    <Select.Item value="mixed">Mixed Audience</Select.Item>
                  </Select>

                  <Select
                    className="h-auto"
                    label="Output Format"
                    placeholder="Select format"
                    value={customOutputFormat}
                    onValueChange={setCustomOutputFormat}
                  >
                    <Select.Item value="markdown">Markdown</Select.Item>
                    <Select.Item value="html">HTML</Select.Item>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {/* Show message if no org AI context exists */}
          {useOrgAIContext && (
            <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start gap-2">
                <span className="text-blue-600 text-sm">ℹ️</span>
                <div className="flex flex-col gap-1">
                  <span className="text-sm font-medium text-blue-800">Using Organization AI Context</span>
                  <span className="text-xs text-blue-600">
                    This template will use your organization's AI context settings. If you haven't configured them yet,
                    <button className="underline ml-1" onClick={() => window.location.href = '/dashboard/ai-context'}>
                      set up AI context settings
                    </button>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sections */}
        <div className="flex w-full flex-col gap-4">
          <div className="flex items-center justify-between">
            <span className="text-heading-3 font-heading-3 text-default-font">
              Template Sections
            </span>
            <Button
              variant="neutral-secondary"
              icon={<FeatherPlus />}
              onClick={addSection}
            >
              Add Section
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            {sections.map((section, index) => (
              <div key={section.id} className="border rounded-lg p-4 bg-neutral-50">
                <div className="flex items-center gap-2 mb-3">
                  <FeatherGripVertical className="text-neutral-400" />
                  <span className="text-sm font-medium">Section {index + 1}</span>
                  <div className="flex-1" />
                  <IconButton
                    icon={<FeatherTrash2 />}
                    onClick={() => removeSection(section.id)}
                    size="small"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="flex flex-col">
                    <TextField
                      className="h-auto"
                      label="Section Name"
                    >
                      <TextField.Input
                        placeholder="e.g., What's New"
                        value={section.name}
                        onChange={(e) => {
                          updateSection(section.id, { name: e.target.value });
                          validateField('name', e.target.value, section.id);
                        }}
                        className={fieldErrors[`${section.id}-name`] ? 'border-red-500' : ''}
                      />
                    </TextField>
                    {fieldErrors[`${section.id}-name`] && (
                      <span className="text-red-500 text-xs mt-1">{fieldErrors[`${section.id}-name`]}</span>
                    )}
                  </div>

                  <Select
                    className="h-auto"
                    label="Section Type"
                    value={section.type}
                    onValueChange={(value) => updateSection(section.id, { type: value as any })}
                  >
                    {SECTION_TYPES.map(type => (
                      <Select.Item key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </Select.Item>
                    ))}
                  </Select>
                </div>

                <div className="mb-3">
                  <div className="flex gap-2">
                    <input
                      type="checkbox"
                      checked={section.required}
                      onChange={(e) => updateSection(section.id, { required: e.target.checked })}
                      className="mt-1.5 flex-shrink-0"
                    />
                    <label className="flex flex-col cursor-pointer flex-1" onClick={() => updateSection(section.id, { required: !section.required })}>
                      <span className="text-sm">Required section</span>
                      <span className="text-xs text-neutral-500 mt-1">
                        When checked, this section must always be included in release notes using this template
                      </span>
                    </label>
                  </div>
                </div>

                <div className="flex flex-col mb-3">
                  <TextArea
                    className="h-auto w-full"
                    label="AI Prompt"
                    helpText="Tell the AI what to include in this section"
                  >
                    <TextArea.Input
                      className={`min-h-[60px] ${fieldErrors[`${section.id}-prompt`] ? 'border-red-500' : ''}`}
                      placeholder="List new features focusing on user benefits and value"
                      value={section.prompt}
                      onChange={(e) => {
                        updateSection(section.id, { prompt: e.target.value });
                        validateField('prompt', e.target.value, section.id);
                      }}
                    />
                  </TextArea>
                  {fieldErrors[`${section.id}-prompt`] && (
                    <span className="text-red-500 text-xs mt-1">{fieldErrors[`${section.id}-prompt`]}</span>
                  )}
                </div>

                <div className="flex flex-col">
                  <TextArea
                    className="h-auto w-full"
                    label="Example Content"
                    helpText="Show what this section should look like"
                  >
                    <TextArea.Input
                      className={`min-h-[60px] ${fieldErrors[`${section.id}-example`] ? 'border-red-500' : ''}`}
                      placeholder="• New dashboard with real-time analytics&#10;• Mobile app now supports offline mode"
                      value={section.example}
                      onChange={(e) => {
                        updateSection(section.id, { example: e.target.value });
                        validateField('example', e.target.value, section.id);
                      }}
                    />
                  </TextArea>
                  {fieldErrors[`${section.id}-example`] && (
                    <span className="text-red-500 text-xs mt-1">{fieldErrors[`${section.id}-example`]}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Preview */}
        <div className="flex w-full flex-col gap-4">
          <span className="text-heading-3 font-heading-3 text-default-font">
            Preview
          </span>
          <div className="border rounded-lg p-4 bg-white">
            <pre className="whitespace-pre-wrap text-sm text-neutral-600">
              {generateExampleOutput()}
            </pre>
          </div>
        </div>

        {/* Success Messages */}
        {success && <div className="text-green-600 text-sm w-full">Template saved successfully!</div>}
        {/* Only show global error for system issues, not validation */}
        {error && !Object.keys(fieldErrors).length && <div className="text-red-500 text-sm w-full">{error}</div>}

        {/* Actions */}
        <div className="flex w-full items-center justify-end gap-2">
          <Button
            variant="neutral-secondary"
            onClick={handleCancel}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || !isValid}
            loading={loading}
          >
            {initialData ? "Update Template" : "Create Template"}
          </Button>
        </div>
      </div>
    </DialogLayout>
  );
}

export default NewTemplateModal;