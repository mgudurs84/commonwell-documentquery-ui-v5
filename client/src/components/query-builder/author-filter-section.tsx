import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UserCircle } from "lucide-react";

interface AuthorFilterSectionProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  givenName: string;
  onGivenNameChange: (name: string) => void;
  familyName: string;
  onFamilyNameChange: (name: string) => void;
}

export function AuthorFilterSection({
  enabled,
  onEnabledChange,
  givenName,
  onGivenNameChange,
  familyName,
  onFamilyNameChange,
}: AuthorFilterSectionProps) {
  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <UserCircle className="h-4 w-4 text-primary" />
          Author Filter
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="enable-author"
            data-testid="checkbox-enable-author"
            checked={enabled}
            onCheckedChange={(checked) => onEnabledChange(checked === true)}
          />
          <Label htmlFor="enable-author" className="text-sm cursor-pointer">
            Enable Author Filter
          </Label>
        </div>

        {enabled && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="author-given" className="text-sm font-medium">
                First Name (Given)
              </Label>
              <Input
                id="author-given"
                data-testid="input-author-given"
                placeholder="John"
                value={givenName}
                onChange={(e) => onGivenNameChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="author-family" className="text-sm font-medium">
                Last Name (Family)
              </Label>
              <Input
                id="author-family"
                data-testid="input-author-family"
                placeholder="Doe"
                value={familyName}
                onChange={(e) => onFamilyNameChange(e.target.value)}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
