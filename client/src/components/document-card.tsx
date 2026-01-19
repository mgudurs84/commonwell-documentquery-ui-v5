import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  FileText, 
  Download, 
  Copy, 
  Link, 
  Eye, 
  Loader2,
  CheckCircle,
  Building2,
  User
} from "lucide-react";
import type { DocumentReferenceResource, Environment } from "@shared/schema";

interface DocumentCardProps {
  document: DocumentReferenceResource;
  index: number;
  environment: Environment;
  jwtToken: string;
  onPreview: (document: DocumentReferenceResource, contentIndex: number) => void;
}

export function DocumentCard({ document, index, environment, jwtToken, onPreview }: DocumentCardProps) {
  const { toast } = useToast();
  const [downloadingIndex, setDownloadingIndex] = useState<number | null>(null);

  const documentType = document.type?.coding?.[0]?.display || document.type?.text || "Unknown Type";
  const documentTypeCode = document.type?.coding?.[0]?.code || "";
  const status = document.status || "unknown";
  const masterId = document.masterIdentifier?.value || document.id || "N/A";
  const source = document.custodian?.display || "Unknown Source";
  const sourcePatientId = document.context?.sourcePatientInfo?.identifier?.value || "N/A";
  const date = document.date ? new Date(document.date).toLocaleDateString() : "N/A";

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: "Failed to copy",
        description: "Could not copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const handleDownload = async (contentIndex: number) => {
    const content = document.content?.[contentIndex];
    const attachmentUrl = content?.attachment?.url;
    
    if (!attachmentUrl) {
      toast({
        title: "Download Failed",
        description: "No download URL available for this document",
        variant: "destructive",
      });
      return;
    }

    setDownloadingIndex(contentIndex);

    try {
      const response = await fetch("/api/download-document", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          environment,
          jwtToken,
          documentUrl: attachmentUrl,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || result.message || "Download failed");
      }

      const binaryData = atob(result.data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      
      const extension = getExtensionFromContentType(result.contentType);
      const filename = `document_${index + 1}_${contentIndex + 1}_${Date.now()}.${extension}`;
      
      const a = window.document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded`,
      });
    } catch (error: any) {
      toast({
        title: "Download Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingIndex(null);
    }
  };

  const getExtensionFromContentType = (contentType: string): string => {
    const map: Record<string, string> = {
      "application/xml": "xml",
      "text/xml": "xml",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/tiff": "tiff",
      "application/dicom": "dcm",
    };
    return map[contentType] || "bin";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "current": return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "superseded": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "entered-in-error": return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default: return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
    }
  };

  return (
    <Card className="border-card-border" data-testid={`document-card-${index}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h4 className="font-medium text-sm">Document #{index + 1}</h4>
              <p className="text-xs text-muted-foreground">{date}</p>
            </div>
          </div>
          <Badge className={getStatusColor(status)} variant="outline">
            {status}
          </Badge>
        </div>

        <div className="space-y-2 text-sm mb-4">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-24">Type:</span>
            <span className="font-medium">{documentType}</span>
            {documentTypeCode && (
              <Badge variant="secondary" className="text-xs">{documentTypeCode}</Badge>
            )}
          </div>
          
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-24">Document ID:</span>
            <span className="font-mono text-xs break-all flex-1">{masterId.slice(0, 50)}{masterId.length > 50 ? "..." : ""}</span>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-6 w-6 shrink-0"
              onClick={() => copyToClipboard(masterId, "Document ID")}
              data-testid={`button-copy-id-${index}`}
            >
              <Copy className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Source:</span>
            <span className="text-xs">{source}</span>
          </div>

          <div className="flex items-center gap-2">
            <User className="h-3 w-3 text-muted-foreground" />
            <span className="text-muted-foreground">Source Patient ID:</span>
            <span className="font-mono text-xs">{sourcePatientId}</span>
          </div>
        </div>

        {document.content && document.content.length > 0 && (
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2">Available Formats ({document.content.length}):</p>
            <div className="space-y-2">
              {document.content.map((content, contentIndex) => {
                const contentType = content.attachment?.contentType || "unknown";
                const url = content.attachment?.url;
                const size = content.attachment?.size;
                const isDownloading = downloadingIndex === contentIndex;

                return (
                  <div 
                    key={contentIndex} 
                    className="flex items-center justify-between gap-2 p-2 rounded-md bg-muted/50"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge variant="outline" className="text-xs shrink-0">
                        {contentType}
                      </Badge>
                      {size && (
                        <span className="text-xs text-muted-foreground">
                          {(size / 1024).toFixed(1)} KB
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1 shrink-0">
                      {url && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => copyToClipboard(url, "URL")}
                          title="Copy URL"
                          data-testid={`button-copy-url-${index}-${contentIndex}`}
                        >
                          <Link className="h-3 w-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onPreview(document, contentIndex)}
                        title="Preview"
                        data-testid={`button-preview-${index}-${contentIndex}`}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        variant="default"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => handleDownload(contentIndex)}
                        disabled={!url || isDownloading}
                        data-testid={`button-download-${index}-${contentIndex}`}
                      >
                        {isDownloading ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        <span className="text-xs">Download</span>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
