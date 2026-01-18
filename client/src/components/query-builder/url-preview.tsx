import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import type { QueryParameters } from "@shared/schema";
import { BASE_URLS } from "@shared/schema";

interface UrlPreviewProps {
  params: QueryParameters;
}

export function buildQueryUrl(params: QueryParameters): string {
  const baseUrl = BASE_URLS[params.environment];
  const searchParams = new URLSearchParams();

  if (params.aaid && params.patientId) {
    searchParams.set("patient.identifier", `${params.aaid}|${params.patientId}`);
  }

  if (params.status !== "all") {
    searchParams.set("status", params.status);
  }

  if (params.dateEnabled) {
    if (params.dateFrom) {
      const isoDate = new Date(params.dateFrom).toISOString();
      searchParams.append("date", `ge${isoDate}`);
    }
    if (params.dateTo) {
      const isoDate = new Date(params.dateTo).toISOString();
      searchParams.append("date", `le${isoDate}`);
    }
  }

  if (params.periodEnabled) {
    if (params.periodFrom) {
      const isoDate = new Date(params.periodFrom).toISOString();
      searchParams.append("period", `ge${isoDate}`);
    }
    if (params.periodTo) {
      const isoDate = new Date(params.periodTo).toISOString();
      searchParams.append("period", `le${isoDate}`);
    }
  }

  if (params.documentTypeEnabled) {
    const types = [...params.documentTypes];
    if (params.customDocumentType) {
      types.push(params.customDocumentType);
    }
    types.forEach((type) => {
      searchParams.append("documenttype", type);
    });
  }

  if (params.contentTypeEnabled) {
    params.contentTypes.forEach((type) => {
      searchParams.append("contenttype", type);
    });
  }

  if (params.authorEnabled) {
    if (params.authorGiven) {
      searchParams.set("author.given", params.authorGiven);
    }
    if (params.authorFamily) {
      searchParams.set("author.family", params.authorFamily);
    }
  }

  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

export function UrlPreview({ params }: UrlPreviewProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();
  const url = buildQueryUrl(params);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast({
        title: "Copied to clipboard",
        description: "The query URL has been copied.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy the URL to clipboard.",
      });
    }
  };

  const highlightUrl = (url: string) => {
    const [base, queryPart] = url.split("?");
    if (!queryPart) return <span className="text-foreground">{url}</span>;

    const params = queryPart.split("&");
    return (
      <>
        <span className="text-muted-foreground">{base}</span>
        <span className="text-primary">?</span>
        {params.map((param, i) => {
          const [key, value] = param.split("=");
          return (
            <span key={i}>
              {i > 0 && <span className="text-primary">&amp;</span>}
              <span className="text-accent">{key}</span>
              <span className="text-primary">=</span>
              <span className="text-foreground">{value}</span>
            </span>
          );
        })}
      </>
    );
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Link className="h-4 w-4 text-primary" />
            Query URL Preview
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={params.environment === "production" ? "default" : "secondary"}>
              {params.environment === "production" ? "PROD" : "INT"}
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCopy}
              data-testid="button-copy-url"
            >
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="p-3 bg-muted rounded-md border border-border overflow-x-auto">
          <code className="text-xs font-mono break-all whitespace-pre-wrap" data-testid="text-query-url">
            {highlightUrl(url)}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
