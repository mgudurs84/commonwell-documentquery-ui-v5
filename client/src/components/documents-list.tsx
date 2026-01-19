import { useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DocumentCard } from "./document-card";
import { DocumentPreviewModal } from "./document-preview-modal";
import { Search, FileText } from "lucide-react";
import type { FhirBundle, DocumentReferenceResource, Environment } from "@shared/schema";

interface DocumentsListProps {
  data: FhirBundle;
  environment: Environment;
  jwtToken: string;
}

export function DocumentsList({ data, environment, jwtToken }: DocumentsListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [previewDoc, setPreviewDoc] = useState<{
    document: DocumentReferenceResource;
    contentIndex: number;
  } | null>(null);

  const entries = data.entry || [];
  
  const filteredEntries = entries.filter((entry) => {
    if (!searchTerm) return true;
    const doc = entry.resource;
    if (!doc) return false;
    
    const searchLower = searchTerm.toLowerCase();
    const typeMatch = doc.type?.coding?.[0]?.display?.toLowerCase().includes(searchLower) ||
                      doc.type?.text?.toLowerCase().includes(searchLower);
    const idMatch = doc.masterIdentifier?.value?.toLowerCase().includes(searchLower);
    const sourceMatch = doc.custodian?.display?.toLowerCase().includes(searchLower);
    const statusMatch = doc.status?.toLowerCase().includes(searchLower);
    
    return typeMatch || idMatch || sourceMatch || statusMatch;
  });

  const handlePreview = (document: DocumentReferenceResource, contentIndex: number) => {
    setPreviewDoc({ document, contentIndex });
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileText className="h-8 w-8" />
        </div>
        <p className="text-sm font-medium">No documents found</p>
        <p className="text-xs mt-1">The query returned no document references</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-8"
            data-testid="input-filter-documents"
          />
        </div>
        <Badge variant="secondary" className="gap-1">
          <FileText className="h-3 w-3" />
          {filteredEntries.length} of {entries.length}
        </Badge>
      </div>

      <ScrollArea className="flex-1 h-[calc(100vh-350px)]">
        <div className="space-y-3 pr-4">
          {filteredEntries.map((entry, index) => {
            const document = entry.resource;
            if (!document) return null;
            
            return (
              <DocumentCard
                key={entry.fullUrl || index}
                document={document}
                index={index}
                environment={environment}
                jwtToken={jwtToken}
                onPreview={handlePreview}
              />
            );
          })}
        </div>
      </ScrollArea>

      {previewDoc && (
        <DocumentPreviewModal
          document={previewDoc.document}
          contentIndex={previewDoc.contentIndex}
          environment={environment}
          jwtToken={jwtToken}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </div>
  );
}
