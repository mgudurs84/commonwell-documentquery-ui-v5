import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { File, AlertTriangle } from "lucide-react";
import { MIME_TYPES } from "@shared/schema";

interface ContentTypeSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  selectedTypes: string[];
  onSelectedTypesChange: (types: string[]) => void;
}

export function ContentTypeSection({
  enabled,
  onEnabledChange,
  selectedTypes,
  onSelectedTypesChange,
}: ContentTypeSectionProps) {
  const handleTypeToggle = (type: string) => {
    if (selectedTypes.includes(type)) {
      onSelectedTypesChange(selectedTypes.filter((t) => t !== type));
    } else {
      onSelectedTypesChange([...selectedTypes, type]);
    }
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <File className="h-4 w-4 text-primary" />
          Content Type (MIME Type)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable-content-type"
            data-testid="checkbox-enable-content-type"
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked === true)}
          />
          <Label htmlFor="enable-content-type" className="text-sm cursor-pointer">
            Enable Content Type Filter
          </Label>
        </div>

        {enabled && (
          <>
            <Alert variant="default" className="border-amber-500/30 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <AlertDescription className="text-sm text-amber-600 dark:text-amber-400">
                Note: Only applies to FHIR responders, not IHE/XCA
              </AlertDescription>
            </Alert>

            <ScrollArea className="h-[180px] border border-border rounded-md p-3">
              <div className="space-y-3">
                {MIME_TYPES.map((mime) => (
                  <div key={mime.type} className="flex items-start gap-2">
                    <Checkbox
                      id={`mime-${mime.type.replace(/\//g, "-")}`}
                      data-testid={`checkbox-mime-${mime.type.replace(/\//g, "-")}`}
                      checked={selectedTypes.includes(mime.type)}
                      onCheckedChange={() => handleTypeToggle(mime.type)}
                    />
                    <Label
                      htmlFor={`mime-${mime.type.replace(/\//g, "-")}`}
                      className="text-sm cursor-pointer leading-tight"
                    >
                      <span className="font-mono text-primary">{mime.type}</span>
                      <span className="text-foreground"> - {mime.name}</span>
                      <p className="text-xs text-muted-foreground mt-0.5">{mime.description}</p>
                    </Label>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </CardContent>
    </Card>
  );
}
