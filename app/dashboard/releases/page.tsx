"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { useReleaseNotesStore, useReleaseNotesActions } from "@/lib/store";
import { Button } from "@/subframe-ui/components/Button";
import { TextField } from "@/subframe-ui/components/TextField";
import { FeatherSearch, FeatherEye, FeatherEdit2, FeatherTrash, FeatherMoreHorizontal } from "@subframe/core";
import { Tabs } from "@/subframe-ui/components/Tabs";
import { Table } from "@/subframe-ui/components/Table";
import { Badge } from "@/subframe-ui/components/Badge";
import { DropdownMenu } from "@/subframe-ui/components/DropdownMenu";
import * as SubframeCore from "@subframe/core";
import { IconButton } from "@/subframe-ui/components/IconButton";

export default function ReleaseNotesPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const releaseNotes = useReleaseNotesStore((state) => state.releaseNotes);
  const loading = useReleaseNotesStore((state) => state.isLoading);
  const error = useReleaseNotesStore((state) => state.error);
  const { fetchReleaseNotes, deleteReleaseNote, clearError } = useReleaseNotesActions();

  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchReleaseNotes(user.id);
    }
  }, [user?.id, fetchReleaseNotes]);

  const getReleaseNotesByStatus = (status: string) => {
    return releaseNotes.filter((note) => note.status === status);
  };

  const filteredReleaseNotes = releaseNotes.filter((note) => {
    const matchesSearch =
      !searchTerm ||
      note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === "all" || note.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const handleDelete = async (noteId: string) => {
    if (!window.confirm("Are you sure you want to delete this release note?")) {
      return;
    }
    setDeletingId(noteId);
    try {
      await deleteReleaseNote(noteId);
    } catch (err) {
      console.error("Failed to delete release note:", err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleAction = (action: string, releaseNote: any, data?: any) => {
    switch (action) {
      case "edit":
        // Go to editor page for all release notes
        router.push(`/dashboard/releases/editor/${releaseNote.id}`);
        break;
      case "view":
        window.open(`/notes/${user?.id}/${releaseNote.slug}`, "_blank");
        break;
      case "history":
        // Open version history modal/page
        break;
      case "duplicated":
        // Refresh the list or show success message
        break;
      default:
        break;
    }
  };

  const getTabCounts = () => {
    return {
      all: releaseNotes.length,
      draft: getReleaseNotesByStatus("draft").length,
      scheduled: getReleaseNotesByStatus("scheduled").length,
      published: getReleaseNotesByStatus("published").length,
    };
  };

  const tabCounts = getTabCounts();

  return (
    <div className="flex h-full w-full flex-col items-start">
      <div className="container max-w-none flex w-full grow shrink-0 basis-0 flex-col items-start gap-8 bg-default-background py-12">
        {/* Main Content Card */}
        <div className="w-full rounded-xl border border-neutral-200 bg-white px-8 py-8 flex flex-col gap-6">
          {/* Header Row */}
          <div className="flex w-full items-center justify-between gap-4 mb-2">
            <div className="flex flex-col gap-1">
              <span className="text-3xl font-bold text-default-font">Release Notes</span>
              <span className="text-base text-neutral-500">Manage and publish your product updates</span>
            </div>
            <Button variant="brand-primary" size="large" onClick={() => router.push('/dashboard/releases/start')}>
              Create New Release
            </Button>
          </div>
          {/* Search and Tabs */}
          <div className="flex w-full flex-wrap items-center gap-2">
            <TextField
              className="h-auto w-64 flex-none"
              label=""
              helpText=""
              icon={<FeatherSearch />}
            >
              <TextField.Input
                placeholder="Search releases..."
                value={searchTerm}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => setSearchTerm(event.target.value)}
              />
            </TextField>
            {error && (
              <Button variant="neutral-tertiary" onClick={clearError} className="text-red-600">
                Clear Error
              </Button>
            )}
          </div>
          <Tabs>
            <Tabs.Item active={activeTab === "all"} onClick={() => setActiveTab("all")}>All {tabCounts.all > 0 && `(${tabCounts.all})`}</Tabs.Item>
            <Tabs.Item active={activeTab === "draft"} onClick={() => setActiveTab("draft")}>Draft {tabCounts.draft > 0 && `(${tabCounts.draft})`}</Tabs.Item>
            <Tabs.Item active={activeTab === "scheduled"} onClick={() => setActiveTab("scheduled")}>Scheduled {tabCounts.scheduled > 0 && `(${tabCounts.scheduled})`}</Tabs.Item>
            <Tabs.Item active={activeTab === "published"} onClick={() => setActiveTab("published")}>Published {tabCounts.published > 0 && `(${tabCounts.published})`}</Tabs.Item>
          </Tabs>
          {/* Empty State or Table */}
          {filteredReleaseNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 w-full">
              <span className="text-2xl font-bold text-neutral-500">No release notes found</span>
              <span className="text-base text-neutral-400">Start by creating your first release note.</span>
              <Button variant="brand-primary" size="large" className="mt-2" onClick={() => router.push('/dashboard/releases/start')}>Create Release Note</Button>
            </div>
          ) : (
            <div className="flex w-full flex-col items-start gap-6 overflow-hidden overflow-x-auto">
              <Table
                header={
                  <Table.HeaderRow>
                    <Table.HeaderCell>Title</Table.HeaderCell>
                    <Table.HeaderCell>Status</Table.HeaderCell>
                    <Table.HeaderCell>Version</Table.HeaderCell>
                    <Table.HeaderCell>Last Updated</Table.HeaderCell>
                    <Table.HeaderCell>Views</Table.HeaderCell>
                    <Table.HeaderCell />
                  </Table.HeaderRow>
                }
              >
                {filteredReleaseNotes.map((note) => (
                  <Table.Row key={note.id} className="hover:bg-neutral-50 transition">
                    <Table.Cell>
                      <span className="text-lg font-bold text-default-font">
                        {note.title || 'Untitled Release Note'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge variant={note.status === 'published' ? 'success' : note.status === 'scheduled' ? 'warning' : note.status === 'draft' ? 'neutral' : 'brand'}>
                        {note.status.charAt(0).toUpperCase() + note.status.slice(1)}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-base text-neutral-500">
                        {note.version || '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-base text-neutral-500">
                        {note.updated_at ? new Date(note.updated_at).toLocaleDateString() : '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <span className="text-base text-neutral-500">
                        {note.views ?? '-'}
                      </span>
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex grow shrink-0 basis-0 items-center justify-end">
                        <SubframeCore.DropdownMenu.Root>
                          <SubframeCore.DropdownMenu.Trigger asChild={true}>
                            <IconButton
                              icon={<FeatherMoreHorizontal />}
                              aria-label="More actions"
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
                                <DropdownMenu.DropdownItem icon={<FeatherEye />} onClick={() => handleAction('view', note)} title="View Public Page">
                                  View
                                </DropdownMenu.DropdownItem>
                                <DropdownMenu.DropdownItem icon={<FeatherEdit2 />} onClick={() => handleAction('edit', note)} title="Edit Release Note">
                                  Edit
                                </DropdownMenu.DropdownItem>
                                <DropdownMenu.DropdownDivider />
                                <DropdownMenu.DropdownItem icon={<FeatherTrash />} onClick={() => handleDelete(note.id)} title="Delete Release Note">
                                  Delete
                                </DropdownMenu.DropdownItem>
                              </DropdownMenu>
                            </SubframeCore.DropdownMenu.Content>
                          </SubframeCore.DropdownMenu.Portal>
                        </SubframeCore.DropdownMenu.Root>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 