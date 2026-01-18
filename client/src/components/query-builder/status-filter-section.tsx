import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { FileCheck } from "lucide-react";
import type { DocumentStatus } from "@shared/schema";

interface StatusFilterSectionProps {
  status: DocumentStatus;
  onStatusChange: (status: DocumentStatus) => void;
}

export function StatusFilterSection({
  status,
  onStatusChange,
}: StatusFilterSectionProps) {
  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileCheck className="h-4 w-4 text-primary" />
          Document Status
        </CardTitle>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={status}
          onValueChange={(v) => onStatusChange(v as DocumentStatus)}
          className="space-y-3"
        >
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="all" id="status-all" data-testid="radio-status-all" />
            <Label htmlFor="status-all" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              All
              <span className="text-xs text-muted-foreground">(no filter)</span>
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="current" id="status-current" data-testid="radio-status-current" />
            <Label htmlFor="status-current" className="text-sm font-normal cursor-pointer flex items-center gap-2">
              Current
              <Badge variant="secondary" size="sm">Recommended</Badge>
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="superseded" id="status-superseded" data-testid="radio-status-superseded" />
            <Label htmlFor="status-superseded" className="text-sm font-normal cursor-pointer">
              Superseded
            </Label>
          </div>
          <div className="flex items-center space-x-3">
            <RadioGroupItem value="entered-in-error" id="status-error" data-testid="radio-status-error" />
            <Label htmlFor="status-error" className="text-sm font-normal cursor-pointer">
              Entered in Error
            </Label>
          </div>
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
