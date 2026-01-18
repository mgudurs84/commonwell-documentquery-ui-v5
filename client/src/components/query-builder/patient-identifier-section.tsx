import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { User } from "lucide-react";

interface PatientIdentifierSectionProps {
  aaid: string;
  onAaidChange: (aaid: string) => void;
  patientId: string;
  onPatientIdChange: (patientId: string) => void;
}

export function PatientIdentifierSection({
  aaid,
  onAaidChange,
  patientId,
  onPatientIdChange,
}: PatientIdentifierSectionProps) {
  const combinedIdentifier = aaid && patientId ? `${aaid}|${patientId}` : "";

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <User className="h-4 w-4 text-primary" />
          Patient Identifier
          <span className="text-destructive text-sm font-normal">(Required)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="aaid" className="text-sm font-medium">
            Assigning Authority ID (AAID) <span className="text-destructive">*</span>
          </Label>
          <Input
            id="aaid"
            data-testid="input-aaid"
            placeholder="2.16.840.1.113883.3.101.1"
            value={aaid}
            onChange={(e) => onAaidChange(e.target.value)}
            className="font-mono text-sm"
          />
          <p className="text-xs text-muted-foreground">
            OID format (e.g., 2.16.840.1.113883.3.101.1)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="patient-id" className="text-sm font-medium">
            Patient ID <span className="text-destructive">*</span>
          </Label>
          <Input
            id="patient-id"
            data-testid="input-patient-id"
            placeholder="patient123"
            value={patientId}
            onChange={(e) => onPatientIdChange(e.target.value)}
            className="font-mono text-sm"
          />
        </div>

        {combinedIdentifier && (
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              Combined Identifier Preview
            </Label>
            <div className="p-3 bg-muted rounded-md border border-border">
              <code className="text-sm font-mono text-foreground break-all" data-testid="text-combined-identifier">
                {combinedIdentifier}
              </code>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
