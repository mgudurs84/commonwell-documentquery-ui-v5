import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DocumentsList } from "./documents-list";
import { Database, Download, ChevronDown, ChevronRight, FileText, Clock, Loader2, AlertCircle, Code, List } from "lucide-react";
import type { Environment, FhirBundle } from "@shared/schema";

interface ResultsDisplayProps {
  data: any | null;
  isLoading: boolean;
  error: Error | null;
  responseTime?: number;
  environment?: Environment;
  jwtToken?: string;
}

function JsonViewer({ data, level = 0 }: { data: any; level?: number }) {
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set(level === 0 ? ["entry", "resource"] : []));

  const toggleKey = (key: string) => {
    const newExpanded = new Set(expandedKeys);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedKeys(newExpanded);
  };

  if (data === null) return <span className="text-muted-foreground">null</span>;
  if (data === undefined) return <span className="text-muted-foreground">undefined</span>;

  if (typeof data === "string") {
    if (data.length > 100) {
      return (
        <span className="text-amber-600 dark:text-amber-400 break-all">
          "{data.slice(0, 100)}..."
        </span>
      );
    }
    return <span className="text-amber-600 dark:text-amber-400">"{data}"</span>;
  }

  if (typeof data === "number") {
    return <span className="text-blue-600 dark:text-blue-400">{data}</span>;
  }

  if (typeof data === "boolean") {
    return <span className="text-purple-600 dark:text-purple-400">{data.toString()}</span>;
  }

  if (Array.isArray(data)) {
    if (data.length === 0) return <span className="text-muted-foreground">[]</span>;
    
    const key = `array-${level}`;
    const isExpanded = expandedKeys.has(key);

    return (
      <div className="ml-4">
        <span
          className="cursor-pointer text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
          onClick={() => toggleKey(key)}
        >
          {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          <span className="text-xs">Array[{data.length}]</span>
        </span>
        {isExpanded && (
          <div className="ml-4 border-l border-border pl-2">
            {data.map((item, i) => (
              <div key={i} className="my-1">
                <span className="text-muted-foreground text-xs mr-2">[{i}]:</span>
                <JsonViewer data={item} level={level + 1} />
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (typeof data === "object") {
    const keys = Object.keys(data);
    if (keys.length === 0) return <span className="text-muted-foreground">{"{}"}</span>;

    return (
      <div className="ml-4">
        {keys.map((key) => {
          const value = data[key];
          const isComplexValue = typeof value === "object" && value !== null;
          const expandKey = `${key}-${level}`;
          const isExpanded = expandedKeys.has(expandKey);

          if (!isComplexValue) {
            return (
              <div key={key} className="my-1">
                <span className="text-primary font-medium">{key}</span>
                <span className="text-muted-foreground">: </span>
                <JsonViewer data={value} level={level + 1} />
              </div>
            );
          }

          return (
            <Collapsible key={key} open={isExpanded} onOpenChange={() => toggleKey(expandKey)}>
              <CollapsibleTrigger className="flex items-center gap-1 hover:bg-muted/50 rounded px-1 -ml-1">
                {isExpanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                <span className="text-primary font-medium">{key}</span>
                <span className="text-muted-foreground text-xs">
                  {Array.isArray(value) ? `[${value.length}]` : "{...}"}
                </span>
              </CollapsibleTrigger>
              <CollapsibleContent className="border-l border-border ml-1 pl-2">
                <JsonViewer data={value} level={level + 1} />
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    );
  }

  return <span>{String(data)}</span>;
}

export function ResultsDisplay({ data, isLoading, error, responseTime, environment, jwtToken }: ResultsDisplayProps) {
  const [activeTab, setActiveTab] = useState("documents");

  const handleExport = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.download = `commonwell-response-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const documentCount = data?.total ?? data?.entry?.length ?? 0;
  const isFhirBundle = data?.resourceType === "Bundle" && Array.isArray(data?.entry);

  return (
    <Card className="border-card-border h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <Database className="h-4 w-4 text-primary" />
            Results
          </CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            {responseTime !== undefined && (
              <Badge variant="outline" className="gap-1">
                <Clock className="h-3 w-3" />
                {responseTime}ms
              </Badge>
            )}
            {data && (
              <>
                <Badge variant="secondary" className="gap-1">
                  <FileText className="h-3 w-3" />
                  {documentCount} {documentCount === 1 ? "document" : "documents"}
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  data-testid="button-export-json"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export JSON
                </Button>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-1 min-h-0">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
            <p className="text-sm font-medium">Executing query...</p>
            <p className="text-xs mt-1">This may take up to 50 seconds</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full py-12">
            <div className="p-4 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="h-8 w-8 text-destructive" />
            </div>
            <p className="text-sm font-medium text-destructive mb-2">Query Failed</p>
            <p className="text-xs text-muted-foreground text-center max-w-md">{error.message}</p>
          </div>
        ) : data ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-2 mb-3">
              <TabsTrigger value="documents" className="gap-1" data-testid="tab-documents">
                <List className="h-3 w-3" />
                Documents
              </TabsTrigger>
              <TabsTrigger value="json" className="gap-1" data-testid="tab-json">
                <Code className="h-3 w-3" />
                Raw JSON
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="documents" className="flex-1 min-h-0 mt-0">
              {isFhirBundle && environment && jwtToken ? (
                <DocumentsList
                  data={data as FhirBundle}
                  environment={environment}
                  jwtToken={jwtToken}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <FileText className="h-8 w-8 mb-4" />
                  <p className="text-sm">Document list view not available</p>
                  <p className="text-xs mt-1">Switch to Raw JSON tab to view data</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="json" className="flex-1 min-h-0 mt-0">
              <ScrollArea className="h-[calc(100vh-330px)]">
                <div className="font-mono text-xs leading-relaxed p-2 bg-muted/50 rounded-md" data-testid="json-results">
                  <JsonViewer data={data} />
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
            <div className="p-4 rounded-full bg-muted mb-4">
              <Database className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium">No results yet</p>
            <p className="text-xs mt-1">Execute a query to see results here</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
