

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ArticleViewerProps = {
  content: string;
  onTextSelect: (text: string) => void;
  activeFieldId: string | null;
};

export function ArticleViewer({ content, onTextSelect, activeFieldId }: ArticleViewerProps) {
  const handleSelection = () => {
    if (!activeFieldId) return;
    const selection = window.getSelection()?.toString().trim();
    if (selection) {
      onTextSelect(selection);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 h-full">
      <div
        className="prose prose-sm max-w-none h-full overflow-y-auto rounded-lg bg-background p-6"
        onMouseUp={handleSelection}
        onTouchEnd={handleSelection}
      >
        <h2 className="font-bold text-lg mb-4">Konten Artikel</h2>
        <div className="break-words">
          {content.split('\n').map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
