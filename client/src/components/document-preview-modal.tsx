import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Download, Loader2, FileText, Code, AlertCircle } from "lucide-react";
import type { DocumentReferenceResource, Environment } from "@shared/schema";

interface DocumentPreviewModalProps {
  document: DocumentReferenceResource;
  contentIndex: number;
  environment: Environment;
  jwtToken: string;
  onClose: () => void;
}

export function DocumentPreviewModal({
  document,
  contentIndex,
  environment,
  jwtToken,
  onClose,
}: DocumentPreviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [content, setContent] = useState<string | null>(null);
  const [contentType, setContentType] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const attachmentUrl = document.content?.[contentIndex]?.attachment?.url;
  const declaredContentType = document.content?.[contentIndex]?.attachment?.contentType || "";

  useEffect(() => {
    if (!attachmentUrl) {
      setError("No document URL available");
      setLoading(false);
      return;
    }

    const fetchDocument = async () => {
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
          throw new Error(result.error || result.message || "Failed to load document");
        }

        setContentType(result.contentType);

        if (result.contentType === "application/pdf") {
          const binaryData = atob(result.data);
          const bytes = new Uint8Array(binaryData.length);
          for (let i = 0; i < binaryData.length; i++) {
            bytes[i] = binaryData.charCodeAt(i);
          }
          const blob = new Blob([bytes], { type: "application/pdf" });
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
        } else {
          const binaryData = atob(result.data);
          setContent(binaryData);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDocument();

    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [attachmentUrl, environment, jwtToken]);

  const handleDownload = async () => {
    if (!attachmentUrl) return;

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
        throw new Error(result.error || "Download failed");
      }

      const binaryData = atob(result.data);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      
      const blob = new Blob([bytes], { type: result.contentType });
      const url = URL.createObjectURL(blob);
      
      const ext = getExtension(result.contentType);
      const filename = `document_${Date.now()}.${ext}`;
      
      const a = window.document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: `${filename} has been downloaded`,
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  const getExtension = (ct: string): string => {
    const map: Record<string, string> = {
      "application/xml": "xml",
      "text/xml": "xml",
      "application/pdf": "pdf",
      "text/plain": "txt",
      "image/jpeg": "jpg",
      "image/png": "png",
    };
    return map[ct] || "bin";
  };

  const isXml = contentType.includes("xml");
  const isPdf = contentType === "application/pdf";
  const isImage = contentType.startsWith("image/");
  const isText = contentType === "text/plain";

  const formatXml = (xml: string): string => {
    try {
      let formatted = "";
      let indent = 0;
      const parts = xml.replace(/>\s*</g, ">\n<").split("\n");
      
      parts.forEach((part) => {
        if (part.match(/^<\/\w/)) indent--;
        formatted += "  ".repeat(Math.max(0, indent)) + part + "\n";
        if (part.match(/^<\w[^>]*[^\/]>.*$/)) indent++;
      });
      
      return formatted.trim();
    } catch {
      return xml;
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Document Preview
            </DialogTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline">{declaredContentType || contentType}</Badge>
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                disabled={loading || !!error}
                data-testid="button-preview-download"
              >
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 mt-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-sm text-muted-foreground">Loading document...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64">
              <div className="p-4 rounded-full bg-destructive/10 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <p className="text-sm font-medium text-destructive mb-2">Failed to Load</p>
              <p className="text-xs text-muted-foreground">{error}</p>
            </div>
          ) : isPdf && pdfUrl ? (
            <iframe
              src={pdfUrl}
              className="w-full h-[60vh] rounded-md border"
              title="PDF Preview"
            />
          ) : isImage && content ? (
            <div className="flex items-center justify-center h-[60vh] bg-muted rounded-md">
              <img
                src={`data:${contentType};base64,${btoa(content)}`}
                alt="Document preview"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : isXml && content ? (
            <Tabs defaultValue="formatted" className="h-full flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mb-2">
                <TabsTrigger value="formatted">Formatted</TabsTrigger>
                <TabsTrigger value="raw">Raw</TabsTrigger>
              </TabsList>
              <TabsContent value="formatted" className="flex-1 min-h-0">
                <ScrollArea className="h-[55vh] rounded-md border bg-muted/30">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                    {formatXml(content)}
                  </pre>
                </ScrollArea>
              </TabsContent>
              <TabsContent value="raw" className="flex-1 min-h-0">
                <ScrollArea className="h-[55vh] rounded-md border bg-muted/30">
                  <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                    {content}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          ) : content ? (
            <ScrollArea className="h-[60vh] rounded-md border bg-muted/30">
              <pre className="p-4 text-xs font-mono whitespace-pre-wrap break-all">
                {content}
              </pre>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center h-64">
              <Code className="h-8 w-8 text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground">No content available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
