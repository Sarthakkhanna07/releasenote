"use client";

import React, { useState, useEffect } from "react";
import {
  DefaultPageLayout,
  Button,
  Badge,
  TextField,
  IconButton,
  DropdownMenu,
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
} from "@subframe/core";
import * as SubframeCore from "@subframe/core";
import { AI_TEMPLATES, AITemplate } from "@/lib/ai/templates";
import { toast } from "sonner";

function TemplateForm({ template, onSave, onCancel }: {
  template?: Partial<AITemplate>;
  onSave: (t: AITemplate) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<Partial<AITemplate>>(template || {});

  useEffect(() => {
    setForm(template || {});
  }, [template]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    if (!form.name || !form.id || !form.description) {
      toast.error("Name, ID, and Description are required.");
      return;
    }
    onSave(form as AITemplate);
  };

  return (
    <div className="space-y-3">
      <input name="id" placeholder="ID" value={form.id || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <input name="name" placeholder="Name" value={form.name || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <textarea name="description" placeholder="Description" value={form.description || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <input name="icon" placeholder="Icon (emoji)" value={form.icon || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <input name="category" placeholder="Category" value={form.category || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <input name="tone" placeholder="Tone" value={form.tone || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <input name="targetAudience" placeholder="Target Audience" value={form.targetAudience || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <input name="outputFormat" placeholder="Output Format" value={form.outputFormat || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <textarea name="systemPrompt" placeholder="System Prompt" value={form.systemPrompt || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <textarea name="userPromptTemplate" placeholder="User Prompt Template" value={form.userPromptTemplate || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <textarea name="exampleOutput" placeholder="Example Output" value={form.exampleOutput || ""} onChange={handleChange} className="w-full border p-2 rounded" />
      <div className="flex gap-2 justify-end">
        <Button variant="neutral-tertiary" onClick={onCancel}>Cancel</Button>
        <Button onClick={handleSubmit}>Save</Button>
      </div>
    </div>
  );
}

function TemplatePage() {
  const [templates, setTemplates] = useState<AITemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<AITemplate | null>(null);
  const [preview, setPreview] = useState<AITemplate | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);

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
    setEditing({} as AITemplate);
    setShowDialog(true);
  };

  const handleEdit = (t: AITemplate) => {
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

  const handleSave = async (t: AITemplate) => {
    let res, json: any;
    const isEdit = !!t.id && templates.some((pt) => pt.id === t.id);
    try {
      if (isEdit) {
        res = await fetch(`/api/templates/${t.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
        json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to update template");
        setTemplates((prev) => prev.map((pt) => (pt.id === t.id ? json.template : pt)));
        toast.success("Template updated");
      } else {
        res = await fetch("/api/templates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(t),
        });
        json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to create template");
        setTemplates((prev) => [...prev, json.template]);
        toast.success("Template created");
      }
      setShowDialog(false);
      setEditing(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save template");
    }
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
                  className="flex grow shrink-0 basis-0 flex-col items-start gap-6 rounded-md border border-solid border-neutral-border bg-default-background px-6 py-6"
                >
                  <div className="flex w-full flex-col items-start gap-4">
                    <div className="flex w-full items-start justify-between">
                      <div className="flex grow shrink-0 basis-0 flex-col items-start gap-2">
                        <span className="text-heading-2 font-heading-2 text-default-font">{t.name}</span>
                        <span className="text-body font-body text-subtext-color">{t.description}</span>
                      </div>
                      <Badge variant="neutral" icon={<FeatherClock />}>
                        {"No edit info"}
                      </Badge>
                    </div>
                    <div className="flex w-full flex-col items-start gap-4">
                      <div className="flex flex-wrap items-center gap-2">
                        {t.category && (
                          <Badge variant="neutral" icon={<FeatherLayout />}>{t.category}</Badge>
                        )}
                        {t.targetAudience && (
                          <Badge variant="neutral" icon={<FeatherUsers />}>{t.targetAudience}</Badge>
                        )}
                        {t.outputFormat && (
                          <Badge variant="neutral" icon={<FeatherFileText />}>{t.outputFormat}</Badge>
                        )}
                        {t.tone && (
                          <Badge variant="neutral" icon={<FeatherMessageCircle />}>{t.tone}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <FeatherFileText className="text-caption font-caption text-subtext-color" />
                        <span className="text-caption font-caption text-subtext-color">
                          {t.exampleOutput ? `${t.exampleOutput.split(" ").length} words` : "-"}
                        </span>
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
                          onClick={() => {}}
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
        {/* Add TemplateForm component before TemplatePage's return */}
        {/* Add/Edit Dialog */}
        {showDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
              <div className="mb-4 text-lg font-bold">{editing?.id ? "Edit Template" : "Add Template"}</div>
              <TemplateForm
                template={editing || {}}
                onSave={handleSave}
                onCancel={() => { setShowDialog(false); setEditing(null); }}
              />
            </div>
          </div>
        )}
        {/* Preview Dialog */}
        {preview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
              <div className="mb-4 text-lg font-bold">Preview: {preview.name}</div>
              <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-600 max-h-60 overflow-y-auto whitespace-pre-wrap font-mono">
                {preview.exampleOutput || "No example output."}
              </div>
              <div className="flex justify-end mt-4">
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
