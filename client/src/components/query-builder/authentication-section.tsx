import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, Clock, Wand2, ChevronDown, User, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Environment, ClearIdTokenClaims, GenerateJwtResponse } from "@shared/schema";

interface AuthenticationSectionProps {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  jwtToken: string;
  onJwtTokenChange: (token: string) => void;
  clearIdToken?: string;
  onClearIdTokenChange?: (token: string) => void;
  onClearClaimsChange?: (claims: ClearIdTokenClaims | null) => void;
}

function decodeClearIdToken(token: string): ClearIdTokenClaims | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload;
  } catch {
    return null;
  }
}

export function AuthenticationSection({
  environment,
  onEnvironmentChange,
  jwtToken,
  onJwtTokenChange,
  clearIdToken = "",
  onClearIdTokenChange,
  onClearClaimsChange,
}: AuthenticationSectionProps) {
  const [showToken, setShowToken] = useState(false);
  const [showGeneratedJwt, setShowGeneratedJwt] = useState(false);
  const [decodedClaims, setDecodedClaims] = useState<ClearIdTokenClaims | null>(null);
  const [jwtError, setJwtError] = useState<string | null>(null);

  const generateJwtMutation = useMutation({
    mutationFn: async (clearToken: string): Promise<GenerateJwtResponse> => {
      const response = await apiRequest("POST", "/api/generate-jwt", { clearIdToken: clearToken });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.jwt) {
        onJwtTokenChange(data.jwt);
        if (data.claims) {
          setDecodedClaims(data.claims);
          onClearClaimsChange?.(data.claims);
        }
        setJwtError(null);
      } else {
        setJwtError(data.error || "Failed to generate JWT");
      }
    },
    onError: (error: Error) => {
      setJwtError(error.message);
    },
  });

  useEffect(() => {
    if (clearIdToken) {
      const claims = decodeClearIdToken(clearIdToken);
      if (claims) {
        setDecodedClaims(claims);
        onClearClaimsChange?.(claims);
      }
    } else {
      setDecodedClaims(null);
      onClearClaimsChange?.(null);
    }
  }, [clearIdToken, onClearClaimsChange]);

  const handleGenerateJwt = () => {
    if (!clearIdToken.trim()) {
      setJwtError("Please enter a CLEAR ID Token first");
      return;
    }
    generateJwtMutation.mutate(clearIdToken.trim());
  };

  const formatExpiryTime = (exp: number) => {
    const now = Math.floor(Date.now() / 1000);
    const seconds = exp - now;
    if (seconds < 0) return "Expired";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m`;
  };

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <KeyRound className="h-4 w-4 text-primary" />
          Authentication
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="environment" className="text-sm font-medium">
            Environment
          </Label>
          <Select value={environment} onValueChange={(v) => onEnvironmentChange(v as Environment)}>
            <SelectTrigger data-testid="select-environment" className="w-full">
              <SelectValue placeholder="Select environment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="integration" data-testid="option-integration">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                  Integration
                </div>
              </SelectItem>
              <SelectItem value="production" data-testid="option-production">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Production
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="clear-id-token" className="text-sm font-medium">
            CLEAR ID Token <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Paste your CLEAR OIDC ID Token (from Accounts Team API). The CommonWell JWT will be generated automatically.
          </p>
          <div className="relative">
            <Textarea
              id="clear-id-token"
              data-testid="input-clear-id-token"
              placeholder="Paste your CLEAR ID Token here (eyJhbGciOiJSUzI1NiIs...)..."
              className={`min-h-[100px] font-mono text-xs resize-none ${!showToken ? "text-security-disc" : ""}`}
              value={clearIdToken}
              onChange={(e) => {
                onClearIdTokenChange?.(e.target.value);
                setJwtError(null);
                onJwtTokenChange("");
              }}
              style={!showToken ? { WebkitTextSecurity: "disc" } as React.CSSProperties : {}}
            />
          </div>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Checkbox
                id="show-token"
                data-testid="checkbox-show-token"
                checked={showToken}
                onCheckedChange={(checked) => setShowToken(checked === true)}
              />
              <Label htmlFor="show-token" className="text-sm text-muted-foreground cursor-pointer">
                <span className="flex items-center gap-1">
                  {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {showToken ? "Hide" : "Show"} Token
                </span>
              </Label>
            </div>
            <Button
              variant="default"
              size="sm"
              onClick={handleGenerateJwt}
              disabled={generateJwtMutation.isPending || !clearIdToken.trim()}
              data-testid="button-generate-jwt"
            >
              {generateJwtMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Wand2 className="h-4 w-4 mr-1" />
              )}
              Generate CommonWell JWT
            </Button>
          </div>
        </div>

        {jwtError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{jwtError}</AlertDescription>
          </Alert>
        )}

        {jwtToken && (
          <Alert className="border-primary/30 bg-primary/5">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <AlertDescription>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-primary font-medium">
                  CommonWell JWT Generated Successfully
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Expires in 1 hour</span>
                </div>
                <Collapsible>
                  <CollapsibleTrigger className="flex items-center gap-1 text-xs text-primary hover:underline">
                    <ChevronDown className="h-3 w-3" />
                    {showGeneratedJwt ? "Hide" : "View"} Generated JWT
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="mt-2 p-2 bg-muted rounded text-xs font-mono break-all max-h-24 overflow-auto">
                      {jwtToken}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {decodedClaims && (
          <Collapsible defaultOpen>
            <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <User className="h-4 w-4" />
              <ChevronDown className="h-3 w-3" />
              Patient Demographics (from CLEAR Token)
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="mt-2 p-3 bg-muted/50 rounded-md text-sm space-y-1">
                <div className="grid grid-cols-2 gap-2">
                  {decodedClaims.given_name && (
                    <div><span className="text-muted-foreground">First Name:</span> <span className="font-medium">{decodedClaims.given_name}</span></div>
                  )}
                  {decodedClaims.family_name && (
                    <div><span className="text-muted-foreground">Last Name:</span> <span className="font-medium">{decodedClaims.family_name}</span></div>
                  )}
                  {decodedClaims.middle_name && (
                    <div><span className="text-muted-foreground">Middle:</span> <span className="font-medium">{decodedClaims.middle_name}</span></div>
                  )}
                  {decodedClaims.birthdate && (
                    <div><span className="text-muted-foreground">DOB:</span> <span className="font-medium">{decodedClaims.birthdate}</span></div>
                  )}
                  {decodedClaims.gender && (
                    <div><span className="text-muted-foreground">Gender:</span> <span className="font-medium">{decodedClaims.gender}</span></div>
                  )}
                  {decodedClaims.phone_number && (
                    <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{decodedClaims.phone_number}</span></div>
                  )}
                </div>
                {decodedClaims.address && (
                  <div className="pt-1 border-t border-border mt-2">
                    <span className="text-muted-foreground">Address:</span>{" "}
                    <span className="font-medium">
                      {[
                        decodedClaims.address.street_address,
                        decodedClaims.address.locality,
                        decodedClaims.address.region,
                        decodedClaims.address.postal_code
                      ].filter(Boolean).join(", ")}
                    </span>
                  </div>
                )}
                {decodedClaims.sub && (
                  <div className="pt-1 border-t border-border mt-2">
                    <span className="text-muted-foreground">CLEAR ID:</span>{" "}
                    <span className="font-mono text-xs">{decodedClaims.sub}</span>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
