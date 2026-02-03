import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { UserPlus, Loader2, CheckCircle2, AlertTriangle, ChevronDown, FileJson } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Environment, CreatePatientRequest, CreatePatientResponse, ClearIdTokenClaims } from "@shared/schema";

interface PatientCreateSectionProps {
  environment: Environment;
  clearIdToken: string;
  clearClaims: ClearIdTokenClaims | null;
  defaultAaid?: string;
}

export function PatientCreateSection({
  environment,
  clearIdToken,
  clearClaims,
  defaultAaid = "",
}: PatientCreateSectionProps) {
  const [cvsPatientId, setCvsPatientId] = useState("");
  const [cvsAaid, setCvsAaid] = useState(defaultAaid);
  const [result, setResult] = useState<CreatePatientResponse | null>(null);

  const createPatientMutation = useMutation({
    mutationFn: async (request: CreatePatientRequest): Promise<CreatePatientResponse> => {
      const response = await apiRequest("POST", "/api/create-patient", request);
      return response.json();
    },
    onSuccess: (data) => {
      setResult(data);
    },
    onError: (error: Error) => {
      setResult({ success: false, error: error.message });
    },
  });

  const handleCreatePatient = () => {
    if (!clearIdToken || !cvsPatientId || !cvsAaid) {
      setResult({ success: false, error: "Please fill in all required fields" });
      return;
    }
    createPatientMutation.mutate({
      environment,
      clearIdToken,
      cvsPatientId,
      cvsAaid,
    });
  };

  const canCreate = clearIdToken && cvsPatientId && cvsAaid && clearClaims;

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserPlus className="h-4 w-4 text-accent" />
          Create Patient in CommonWell
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Create a patient record in CommonWell using demographics from the CLEAR ID Token. This is required before querying documents for a new patient.
        </p>

        {clearClaims && (
          <div className="p-3 bg-muted/50 rounded-md">
            <div className="text-sm font-medium mb-2">Patient to Create:</div>
            <div className="text-sm">
              <span className="font-semibold">
                {clearClaims.given_name} {clearClaims.middle_name || ""} {clearClaims.family_name}
              </span>
              {clearClaims.birthdate && (
                <span className="text-muted-foreground ml-2">DOB: {clearClaims.birthdate}</span>
              )}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cvs-patient-id" className="text-sm font-medium">
            CVS Patient ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cvs-patient-id"
            data-testid="input-cvs-patient-id"
            placeholder="e.g., 601, PAT123456"
            value={cvsPatientId}
            onChange={(e) => {
              setCvsPatientId(e.target.value);
              setResult(null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            The unique patient identifier from CVS systems (MRN or Profile ID)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="cvs-aaid" className="text-sm font-medium">
            CVS Assigning Authority ID (AAID) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="cvs-aaid"
            data-testid="input-cvs-aaid"
            placeholder="e.g., 2.16.840.1.113883.3.CVS"
            value={cvsAaid}
            onChange={(e) => {
              setCvsAaid(e.target.value);
              setResult(null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            The OID of the CVS assigning authority for the patient ID
          </p>
        </div>

        <Button
          onClick={handleCreatePatient}
          disabled={createPatientMutation.isPending || !canCreate}
          className="w-full"
          data-testid="button-create-patient"
        >
          {createPatientMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Create Patient
        </Button>

        {!clearIdToken && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Generate a CommonWell JWT from a CLEAR ID Token first to enable patient creation.
            </AlertDescription>
          </Alert>
        )}

        {result && (
          <Alert variant={result.success ? "default" : "destructive"} className={result.success ? "border-primary/30 bg-primary/5" : ""}>
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 text-primary" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertDescription>
              <div className="space-y-2">
                <div className={`font-medium ${result.success ? "text-primary" : ""}`}>
                  {result.success ? "Patient Created Successfully!" : result.error || "Failed to create patient"}
                </div>
                
                {result.details && (
                  <div className="text-xs text-muted-foreground">
                    {typeof result.details === "object" 
                      ? JSON.stringify(result.details, null, 2).slice(0, 200) + "..."
                      : result.details
                    }
                  </div>
                )}

                {result.patientObject && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ChevronDown className="h-3 w-3" />
                      <FileJson className="h-3 w-3" />
                      View Patient Object Sent
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48">
                        {JSON.stringify(result.patientObject, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {result.patient && result.success && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                      <ChevronDown className="h-3 w-3" />
                      <FileJson className="h-3 w-3" />
                      View Response
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-48">
                        {JSON.stringify(result.patient, null, 2)}
                      </pre>
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
