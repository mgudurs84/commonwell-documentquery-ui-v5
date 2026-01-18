import { useState, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Play, RotateCcw, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { AuthenticationSection } from "@/components/query-builder/authentication-section";
import { PatientIdentifierSection } from "@/components/query-builder/patient-identifier-section";
import { StatusFilterSection } from "@/components/query-builder/status-filter-section";
import { DateFilterSection } from "@/components/query-builder/date-filter-section";
import { DocumentTypeSection } from "@/components/query-builder/document-type-section";
import { ContentTypeSection } from "@/components/query-builder/content-type-section";
import { AuthorFilterSection } from "@/components/query-builder/author-filter-section";
import { UrlPreview, buildQueryUrl } from "@/components/query-builder/url-preview";
import { ResultsDisplay } from "@/components/results-display";
import { QueryHistoryPanel } from "@/components/query-history";
import { apiRequest } from "@/lib/queryClient";
import type { QueryParameters, Environment, DocumentStatus, QueryHistory } from "@shared/schema";

const defaultParams: QueryParameters = {
  environment: "integration",
  jwtToken: "",
  aaid: "",
  patientId: "",
  status: "current",
  dateEnabled: false,
  dateFrom: "",
  dateTo: "",
  periodEnabled: false,
  periodFrom: "",
  periodTo: "",
  documentTypeEnabled: false,
  documentTypes: [],
  customDocumentType: "",
  contentTypeEnabled: false,
  contentTypes: [],
  authorEnabled: false,
  authorGiven: "",
  authorFamily: "",
};

export default function Home() {
  const [params, setParams] = useState<QueryParameters>(defaultParams);
  const [responseTime, setResponseTime] = useState<number | undefined>();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: history = [] } = useQuery<QueryHistory[]>({
    queryKey: ["/api/query-history"],
  });

  const executeMutation = useMutation({
    mutationFn: async (params: QueryParameters) => {
      const startTime = Date.now();
      const response = await apiRequest("POST", "/api/execute-query", params);
      const endTime = Date.now();
      const elapsed = endTime - startTime;
      setResponseTime(elapsed);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/query-history"] });
      const docCount = data?.total ?? data?.entry?.length ?? 0;
      toast({
        title: "Query executed successfully",
        description: `Found ${docCount} document${docCount === 1 ? "" : "s"} in ${responseTime}ms`,
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Query failed",
        description: error.message,
      });
    },
  });

  const clearHistoryMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", "/api/query-history");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/query-history"] });
      toast({
        title: "History cleared",
        description: "Query history has been cleared.",
      });
    },
  });

  const handleExecute = () => {
    if (!params.jwtToken.trim()) {
      toast({
        variant: "destructive",
        title: "JWT Token required",
        description: "Please provide a valid JWT token.",
      });
      return;
    }
    if (!params.aaid || !params.patientId) {
      toast({
        variant: "destructive",
        title: "Patient identifier required",
        description: "Please provide both AAID and Patient ID.",
      });
      return;
    }
    executeMutation.mutate(params);
  };

  const handleReset = () => {
    setParams(defaultParams);
    setResponseTime(undefined);
    toast({
      title: "Form reset",
      description: "All fields have been cleared.",
    });
  };

  const handleReloadHistory = useCallback((query: QueryHistory) => {
    if (query.parameters && typeof query.parameters === "object") {
      setParams(query.parameters as QueryParameters);
      toast({
        title: "Query loaded",
        description: "Parameters have been restored from history.",
      });
    }
  }, [toast]);

  const updateParam = <K extends keyof QueryParameters>(key: K, value: QueryParameters[K]) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-md bg-primary/10">
              <svg className="h-6 w-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">CommonWell Document Query</h1>
              <p className="text-xs text-muted-foreground">CVS IAS Platform - E2E Testing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              data-testid="button-reset-form"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Reset
            </Button>
            <Button
              onClick={handleExecute}
              disabled={executeMutation.isPending}
              data-testid="button-execute-query"
            >
              {executeMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              Execute Query
            </Button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 xl:col-span-4">
            <ScrollArea className="h-[calc(100vh-140px)]">
              <div className="space-y-4 pr-4">
                <AuthenticationSection
                  environment={params.environment}
                  onEnvironmentChange={(v) => updateParam("environment", v)}
                  jwtToken={params.jwtToken}
                  onJwtTokenChange={(v) => updateParam("jwtToken", v)}
                />

                <PatientIdentifierSection
                  aaid={params.aaid}
                  onAaidChange={(v) => updateParam("aaid", v)}
                  patientId={params.patientId}
                  onPatientIdChange={(v) => updateParam("patientId", v)}
                />

                <StatusFilterSection
                  status={params.status}
                  onStatusChange={(v) => updateParam("status", v)}
                />

                <DateFilterSection
                  enabled={params.dateEnabled}
                  onEnabledChange={(v) => updateParam("dateEnabled", v)}
                  dateFrom={params.dateFrom || ""}
                  onDateFromChange={(v) => updateParam("dateFrom", v)}
                  dateTo={params.dateTo || ""}
                  onDateToChange={(v) => updateParam("dateTo", v)}
                  title="Document Creation Date"
                  description="When the document was indexed in CommonWell. Use for incremental sync."
                />

                <DateFilterSection
                  enabled={params.periodEnabled}
                  onEnabledChange={(v) => updateParam("periodEnabled", v)}
                  dateFrom={params.periodFrom || ""}
                  onDateFromChange={(v) => updateParam("periodFrom", v)}
                  dateTo={params.periodTo || ""}
                  onDateToChange={(v) => updateParam("periodTo", v)}
                  title="Service Period"
                  description="When the clinical service/encounter occurred. Different from document creation date."
                  showQuickSelect={false}
                />

                <DocumentTypeSection
                  enabled={params.documentTypeEnabled}
                  onEnabledChange={(v) => updateParam("documentTypeEnabled", v)}
                  selectedTypes={params.documentTypes}
                  onSelectedTypesChange={(v) => updateParam("documentTypes", v)}
                  customType={params.customDocumentType || ""}
                  onCustomTypeChange={(v) => updateParam("customDocumentType", v)}
                />

                <ContentTypeSection
                  enabled={params.contentTypeEnabled}
                  onEnabledChange={(v) => updateParam("contentTypeEnabled", v)}
                  selectedTypes={params.contentTypes}
                  onSelectedTypesChange={(v) => updateParam("contentTypes", v)}
                />

                <AuthorFilterSection
                  enabled={params.authorEnabled}
                  onEnabledChange={(v) => updateParam("authorEnabled", v)}
                  givenName={params.authorGiven || ""}
                  onGivenNameChange={(v) => updateParam("authorGiven", v)}
                  familyName={params.authorFamily || ""}
                  onFamilyNameChange={(v) => updateParam("authorFamily", v)}
                />

                <UrlPreview params={params} />

                <QueryHistoryPanel
                  history={history}
                  onReload={handleReloadHistory}
                  onClear={() => clearHistoryMutation.mutate()}
                />
              </div>
            </ScrollArea>
          </div>

          <div className="lg:col-span-7 xl:col-span-8">
            <ResultsDisplay
              data={executeMutation.data}
              isLoading={executeMutation.isPending}
              error={executeMutation.error}
              responseTime={responseTime}
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card py-3">
        <div className="container mx-auto px-4 flex items-center justify-between text-xs text-muted-foreground">
          <span>CommonWell Health Alliance Specification V4.4</span>
          <span>Last updated: {new Date().toLocaleDateString()}</span>
        </div>
      </footer>
    </div>
  );
}
