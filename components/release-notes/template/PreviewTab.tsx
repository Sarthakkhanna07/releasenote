"use client";

import React from "react";
import { useReleaseNotesStore } from "@/lib/store/use-release-notes";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/subframe-ui/ui/components/Badge";
import { FeatherTag } from "@subframe/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PreviewTabProps {
  draftId: string;
}

const PreviewTab: React.FC<PreviewTabProps> = ({ draftId }) => {
  const { releaseNotes } = useReleaseNotesStore();
  const draft = releaseNotes.find(note => note.id === draftId);

  if (!draft) {
    return <div className="text-red-500">Draft not found.</div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-2xl mx-auto">
      <div className="rounded-2xl shadow bg-white p-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-default-font">{draft.title}</h1>
          {draft.tags && draft.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {draft.tags.map((tag, idx) => (
                <Badge key={idx} variant="neutral" icon={<FeatherTag />}>{tag}</Badge>
              ))}
            </div>
          )}
        </div>
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-8 mb-4 text-default-font" {...props} />,
            h2: ({node, ...props}) => <h2 className="text-xl font-semibold mt-6 mb-3 text-default-font border-b border-neutral-200 pb-1" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-lg font-semibold mt-4 mb-2 text-default-font" {...props} />,
            p: ({node, ...props}) => <p className="mb-3 text-default-font leading-relaxed" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc ml-6 mb-3 text-default-font" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal ml-6 mb-3 text-default-font" {...props} />,
            li: ({node, ...props}) => <li className="mb-1 text-default-font" {...props} />,
            code: ({node, ...props}) => <code className="bg-neutral-100 rounded px-1 text-sm" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-brand-600 pl-4 italic text-neutral-600 my-4" {...props} />,
          }}
        >
          {draft.content_markdown || ""}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default PreviewTab; 