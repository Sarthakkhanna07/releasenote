"use client";

import React, { useState, useEffect } from "react";
import {
  DefaultPageLayout,
  Button,
  Badge,
  TextField,
  IconButton,
  DropdownMenu,
  TextArea,
  Select,
} from "@/components/subframe-ui/ui";
import {
  FeatherDownload,
  FeatherUpload,
  FeatherPlus,
  FeatherSearch,
  FeatherChevronDown,
  FeatherClock,
  FeatherLayout,
  FeatherUsers,
  FeatherFileText,
  FeatherMessageCircle,
  FeatherCopy,
  FeatherEye,
  FeatherEdit2,
  FeatherTrash,
  FeatherMoreVertical,
  FeatherTrendingUp,
  FeatherCode,
  FeatherX,
  FeatherLink,
} from "@subframe/core";
import * as SubframeCore from "@subframe/core";
// Remove old AI_TEMPLATES import - we'll use database templates
import { toast } from "sonner";
import NewTemplateModal from "@/components/release-notes/template/NewTemplateModal";
import SmartImportModal from "@/components/release-notes/template/SmartImportModal";

// Template interface matching your database schema
interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  uses_org_ai_context: boolean;
  tone: string;
  target_audience: string;
  output_format: string;
  system_prompt: string;
  user_prompt_template: string;
  example_output: string;
  content: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  is_default: boolean;
}

function TemplatePage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [editing, setEditing] = useState<Template | null>(null);
  const [smartImportData, setSmartImportData] = useState<any>(null);
  const [preview, setPreview] = useState<Template | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

  // Add effect to toggle light-navbar class
  useEffect(() => {
    if (showDialog) {
      document.body.classList.add("light-navbar");
    } else {
      document.body.classList.remove("light-navbar");
    }
    return () => document.body.classList.remove("light-navbar");
  }, [showDialog]);

  useEffect(() => {
    const fetchTemplates = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/templates");
        const json: any = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to fetch templates");
        setTemplates(json.templates);
      } catch (err: any) {
        setError(err.message || "Failed to fetch templates");
        toast.error(err.message || "Failed to fetch templates");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, []);

  const handleAdd = () => {
    setEditing(null);
    setShowDialog(true);
  };

  const handleEdit = (t: Template) => {
    setEditing(t);
    setShowDialog(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/templates/${id}`, {
        method: "DELETE",
      });
      const json: any = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to delete template");
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast.success("Template deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete template");
    }
  };

  // New: handleSave for modal (refreshes templates after save)
  const handleModalClose = async () => {
    setShowDialog(false);
    setEditing(null);
    // Refresh templates after modal closes
    setLoading(true);
    try {
      const res = await fetch("/api/templates");
      const json: any = await res.json();
      if (res.ok) setTemplates(json.templates);
    } catch { }
    setLoading(false);
  };

  const handleExport = () => {
    if (templates.length === 0) {
      toast.error("No templates to export");
      return;
    }
    const exportData = {
      version: "1.0",
      exported_at: new Date().toISOString(),
      templates: templates.map((t) => ({
        ...t,
        id: undefined,
        organization_id: undefined,
        created_at: undefined,
        updated_at: undefined,
      })),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `templates-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Templates exported successfully");
  };

  const handleImport = async (file: File) => {
    try {
      const text = await file.text();
      const importData = JSON.parse(text);
      if (!importData.templates || !Array.isArray(importData.templates)) {
        throw new Error("Invalid template file format");
      }
      let imported = 0;
      for (const template of importData.templates) {
        try {
          const newTemplate = {
            ...template,
            id: crypto.randomUUID(),
          };
          const res = await fetch("/api/templates", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(newTemplate),
          });
          if (res.ok) {
            const json = await res.json();
            setTemplates((prev) => [...prev, json.template]);
            imported++;
          }
        } catch (err) {
          console.error("Failed to import template:", template.name, err);
        }
      }
      toast.success(`Successfully imported ${imported} template${imported !== 1 ? "s" : ""}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to import templates");
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "application/json") {
        toast.error("Please select a JSON file");
        return;
      }
      setImportFile(file);
      handleImport(file);
    }
  };

  // Filtered templates based on search and category
  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      t.name?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !category || t.category === category;
    return matchesSearch && matchesCategory;
  });

  return (
    <DefaultPageLayout>
      <div className="flex h-full w-full flex-col items-start">
        <div className="flex w-full items-center justify-between border-b border-solid border-neutral-border px-6 py-6">
          <div className="flex flex-col items-start gap-2">
            <span className="text-heading-1 font-heading-1 text-default-font">Templates</span>
            <span className="text-body font-body text-subtext-color">Manage your release note templates</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
              id="import-file"
            />
            <Button
              variant="neutral-tertiary"
              icon={<FeatherDownload />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              variant="neutral-tertiary"
              icon={<FeatherUpload />}
              onClick={() => document.getElementById("import-file")?.click()}
            >
              Import
            </Button>
            <Button
              variant="brand-secondary"
              icon={<FeatherLink />}
              onClick={() => setShowSmartImport(true)}
            >
              Smart Import
            </Button>
            <Button
              icon={<FeatherPlus />}
              onClick={handleAdd}
            >
              New Template
            </Button>
          </div>
        </div>
        <div className="flex w-full grow shrink-0 basis-0 flex-col items-start gap-6 px-6 py-6 overflow-auto">
          <div className="flex w-full items-center gap-4">
            <TextField
              className="h-auto grow shrink-0 basis-0"
              variant="filled"
              label=""
              helpText=""
              icon={<FeatherSearch />}
            >
              <TextField.Input
                placeholder="Search templates..."
                value={search}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearch(event.target.value)}
              />
            </TextField>
            <Button
              variant="neutral-tertiary"
              iconRight={<FeatherChevronDown />}
              onClick={() => setCategory(null)}
            >
              All categories
            </Button>
          </div>
          <div className="w-full items-start gap-6 grid grid-cols-1">
            {loading ? (
              <span className="text-body font-body text-subtext-color">Loading templates...</span>
            ) : error ? (
              <span className="text-body font-body text-red-500">{error}</span>
            ) : filteredTemplates.length === 0 ? (
              <span className="text-body font-body text-subtext-color">No templates found.</span>
            ) : (
              filteredTemplates.map((t) => (
                <div
                  key={t.id}
                  className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-lg border border-solid border-neutral-border bg-default-background px-6 py-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="text-2xl">{t.icon}</div>
                        <div className="flex flex-col items-start gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-heading-2 font-heading-2 text-default-font">{t.name}</span>
                            {t.is_default && (
                              <Badge variant="brand">Default</Badge>
                            )}
                          </div>
                          <span className="text-body font-body text-subtext-color">{t.description}</span>
                        </div>
                      </div>
                      <Badge variant="neutral" icon={<FeatherClock />}>
                        {formatTimeAgo(t.updated_at)}
                      </Badge>
                    </div>
                    <div className="flex w-full flex-col items-start gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.category && (
                          <Badge variant="neutral" icon={<FeatherLayout />}>
                            {t.category.charAt(0).toUpperCase() + t.category.slice(1).replace('-', ' ')}
                          </Badge>
                        )}
                        {t.target_audience && t.target_audience !== 'organization' && (
                          <Badge variant="neutral" icon={<FeatherUsers />}>
                            {t.target_audience.charAt(0).toUpperCase() + t.target_audience.slice(1)}
                          </Badge>
                        )}
                        {t.output_format && (
                          <Badge variant="neutral" icon={<FeatherFileText />}>
                            {t.output_format.toUpperCase()}
                          </Badge>
                        )}
                        {t.tone && t.tone !== 'organization' && (
                          <Badge variant="neutral" icon={<FeatherMessageCircle />}>
                            {t.tone.charAt(0).toUpperCase() + t.tone.slice(1)}
                          </Badge>
                        )}
                        {t.uses_org_ai_context ? (
                          <Badge variant="brand" icon={<FeatherCode />}>
                            Org AI Context
                          </Badge>
                        ) : (
                          <Badge variant="neutral" icon={<FeatherCode />}>
                            Custom AI
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <FeatherFileText className="text-caption font-caption text-subtext-color" />
                          <span className="text-caption font-caption text-subtext-color">
                            {t.example_output ? `${t.example_output.split(" ").length} words` : "No preview"}
                          </span>
                        </div>
                        {(() => {
                          try {
                            const content = JSON.parse(t.content);
                            const sectionCount = content.sections?.length || 0;
                            return (
                              <div className="flex items-center gap-2">
                                <FeatherLayout className="text-caption font-caption text-subtext-color" />
                                <span className="text-caption font-caption text-subtext-color">
                                  {sectionCount} section{sectionCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            );
                          } catch {
                            return null;
                          }
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="flex w-full items-center justify-end gap-2">
                    <IconButton
                      icon={<FeatherEye />}
                      onClick={() => setPreview(t)}
                    />
                    <IconButton
                      icon={<FeatherEdit2 />}
                      onClick={() => handleEdit(t)}
                    />
                    <SubframeCore.DropdownMenu.Root>
                      <SubframeCore.DropdownMenu.Trigger asChild={true}>
                        <IconButton
                          icon={<FeatherMoreVertical />}
                          onClick={() => { }}
                        />
                      </SubframeCore.DropdownMenu.Trigger>
                      <SubframeCore.DropdownMenu.Portal>
                        <SubframeCore.DropdownMenu.Content
                          side="bottom"
                          align="end"
                          sideOffset={4}
                          asChild={true}
                        >
                          <DropdownMenu>
                            <DropdownMenu.DropdownItem icon={<FeatherCopy />}>
                              Duplicate
                            </DropdownMenu.DropdownItem>
                            <DropdownMenu.DropdownItem icon={<FeatherDownload />}>
                              Export
                            </DropdownMenu.DropdownItem>
                            <DropdownMenu.DropdownDivider />
                            <DropdownMenu.DropdownItem icon={<FeatherTrash />} onClick={() => handleDelete(t.id)}>
                              Delete
                            </DropdownMenu.DropdownItem>
                          </DropdownMenu>
                        </SubframeCore.DropdownMenu.Content>
                      </SubframeCore.DropdownMenu.Portal>
                    </SubframeCore.DropdownMenu.Root>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
        {/* Replace TemplateForm dialog with NewTemplateModal */}
        {showDialog && (
          <NewTemplateModal
            open={showDialog}
            onClose={() => {
              handleModalClose();
              setSmartImportData(null); // Clear smart import data after modal closes
            }}
            initialData={smartImportData ? (() => {
              const initialData = {
                name: smartImportData.suggestedTemplate.name,
                description: smartImportData.suggestedTemplate.description,
                icon: smartImportData.suggestedTemplate.icon,
                category: smartImportData.suggestedTemplate.category,
                tone: smartImportData.suggestedTemplate.tone,
                target_audience: smartImportData.suggestedTemplate.target_audience,
                output_format: smartImportData.suggestedTemplate.output_format,
                system_prompt: smartImportData.suggestedTemplate.system_prompt,
                user_prompt_template: smartImportData.suggestedTemplate.user_prompt_template,
                uses_org_ai_context: smartImportData.suggestedTemplate.uses_org_ai_context,
                sections: smartImportData.analysis.sections
              };
              console.log('🔧 Templates Page: Passing initialData to NewTemplateModal:', initialData);
              console.log('📋 Templates Page: Sections being passed:', initialData.sections);
              return initialData;
            })() : editing || undefined}
          />
        )}
        
        {/* Smart Import Modal */}
        {showSmartImport && (
          <SmartImportModal
            open={showSmartImport}
            onClose={() => setShowSmartImport(false)}
            onImportSuccess={handleModalClose}
            onAnalysisComplete={(data) => {
              console.log('🎯 Templates Page: Received smart import data:', data);
              console.log('📋 Templates Page: Analysis sections:', data.analysis?.sections);
              console.log('📝 Templates Page: Suggested template:', data.suggestedTemplate);
              setSmartImportData(data);
              setShowSmartImport(false);
              setShowDialog(true); // Open NewTemplateModal with AI data
              console.log('✅ Templates Page: Opening NewTemplateModal with AI data');
            }}
          />
        )}
        {/* Preview Dialog */}
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="text-2xl">{preview.icon}</div>
                <div className="flex flex-col">
                  <div className="text-lg font-bold">Preview: {preview.name}</div>
                  <div className="text-sm text-gray-500">{preview.category} template</div>
                </div>
              </div>
              <div className="bg-gray-50 p-4 rounded-md text-sm text-gray-700 max-h-96 overflow-y-auto whitespace-pre-wrap font-mono border">
                {preview.example_output || "No example output available."}
              </div>
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span>Format: {preview.output_format.toUpperCase()}</span>
                  <span>Tone: {preview.tone}</span>
                  <span>Audience: {preview.target_audience}</span>
                </div>
                <Button variant="neutral-tertiary" onClick={() => setPreview(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DefaultPageLayout>
  );
}

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default TemplatePage;
