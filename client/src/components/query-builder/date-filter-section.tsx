import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Calendar, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { subDays, subMonths, subYears, format } from "date-fns";

interface DateFilterSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  dateFrom: string;
  onDateFromChange: (date: string) => void;
  dateTo: string;
  onDateToChange: (date: string) => void;
  title?: string;
  description?: string;
  showQuickSelect?: boolean;
}

export function DateFilterSection({
  enabled,
  onEnabledChange,
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
  title = "Document Creation Date",
  description = "When the document was indexed in CommonWell",
  showQuickSelect = true,
}: DateFilterSectionProps) {
  const formatDateForInput = (date: Date) => {
    return format(date, "yyyy-MM-dd'T'HH:mm");
  };

  const applyQuickSelect = (days: number | "year" | "custom") => {
    const now = new Date();
    let fromDate: Date;

    if (days === "year") {
      fromDate = subYears(now, 1);
    } else if (days === "custom") {
      return;
    } else {
      fromDate = subDays(now, days);
    }

    onDateFromChange(formatDateForInput(fromDate));
    onDateToChange(formatDateForInput(now));
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Calendar className="h-4 w-4 text-primary" />
          {title}
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <p className="text-sm">{description}</p>
            </TooltipContent>
          </Tooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`enable-${title.replace(/\s/g, "-").toLowerCase()}`}
            data-testid={`checkbox-enable-${title.replace(/\s/g, "-").toLowerCase()}`}
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked === true)}
          />
          <Label
            htmlFor={`enable-${title.replace(/\s/g, "-").toLowerCase()}`}
            className="text-sm cursor-pointer"
          >
            Enable Date Filter
          </Label>
        </div>

        {enabled && (
          <>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Date From <span className="text-muted-foreground font-normal">(ge - greater than or equal)</span>
                </Label>
                <Input
                  type="datetime-local"
                  data-testid={`input-${title.replace(/\s/g, "-").toLowerCase()}-from`}
                  value={dateFrom}
                  onChange={(e) => onDateFromChange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Date To <span className="text-muted-foreground font-normal">(le - less than or equal)</span>
                </Label>
                <Input
                  type="datetime-local"
                  data-testid={`input-${title.replace(/\s/g, "-").toLowerCase()}-to`}
                  value={dateTo}
                  onChange={(e) => onDateToChange(e.target.value)}
                  className="font-mono text-sm"
                />
              </div>
            </div>

            {showQuickSelect && (
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Quick Select</Label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: "Last 24 Hours", days: 1 },
                    { label: "Last 7 Days", days: 7 },
                    { label: "Last 30 Days", days: 30 },
                    { label: "Last 90 Days", days: 90 },
                    { label: "Last Year", days: "year" as const },
                  ].map((option) => (
                    <Button
                      key={option.label}
                      variant="outline"
                      size="sm"
                      onClick={() => applyQuickSelect(option.days)}
                      data-testid={`button-quick-${option.label.replace(/\s/g, "-").toLowerCase()}`}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
