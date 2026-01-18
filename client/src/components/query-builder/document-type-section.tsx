import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileType } from "lucide-react";
import { LOINC_CODES } from "@shared/schema";

interface DocumentTypeSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[]) => void;
  customType: string;
  onCustomTypeChange: (type: string) => void;
}

export function DocumentTypeSection({
  enabled,
  onEnabledChange,
  selectedTypes,
  onSelectedTypesChange,
  customType,
  onCustomTypeChange,
}: DocumentTypeSectionProps) {
  const handleTypeToggle = (code: string) => {
    if (selectedTypes.includes(code)) {
      onSelectedTypesChange(selectedTypes.filter((t) => t !== code));
    } else {
      onSelectedTypesChange([...selectedTypes, code]);
    }
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <FileType className="h-4 w-4 text-primary" />
          Document Type (LOINC Code)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable-document-type"
            data-testid="checkbox-enable-document-type"
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked === true)}
          />
          <Label htmlFor="enable-document-type" className="text-sm cursor-pointer">
            Enable Document Type Filter
          </Label>
        </div>

        {enabled && (
          <>
            <ScrollArea className="h-[200px] border border-border rounded-md p-3">
              <div className="space-y-3">
                {LOINC_CODES.map((loinc) => (
                  <div key={loinc.code} className="flex items-start gap-2">
                    <Checkbox
                      id={`loinc-${loinc.code}`}
                      data-testid={`checkbox-loinc-${loinc.code}`}
                      checked={selectedTypes.includes(loinc.code)}
                      onCheckedChange={() => handleTypeToggle(loinc.code)}
                    />
                    <Label
                      htmlFor={`loinc-${loinc.code}`}
                      className="text-sm cursor-pointer leading-tight"
                    >
                      <span className="font-mono text-primary">{loinc.code}</span>
                      <span className="text-foreground"> - {loinc.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{loinc.description}</p>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Or enter custom LOINC code</Label>
              <Input
                data-testid="input-custom-loinc"
                placeholder="e.g., 12345-6"
                value={customType}
                onChange={(e) => onCustomTypeChange(e.target.value)}
                className="font-mono text-sm"
              />
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
