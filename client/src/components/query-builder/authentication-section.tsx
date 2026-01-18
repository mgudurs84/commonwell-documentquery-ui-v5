import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { KeyRound, Eye, EyeOff, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import type { Environment, JwtPayload } from "@shared/schema";

interface AuthenticationSectionProps {
  environment: Environment;
  onEnvironmentChange: (env: Environment) => void;
  jwtToken: string;
  onJwtTokenChange: (token: string) => void;
}

function decodeJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
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
}: AuthenticationSectionProps) {
  const [showToken, setShowToken] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    payload?: JwtPayload;
    error?: string;
    expiresIn?: number;
  } | null>(null);

  const handleValidateToken = () => {
    if (!jwtToken.trim()) {
      setValidationResult({ valid: false, error: "No token provided" });
      return;
    }

    const payload = decodeJwt(jwtToken.trim());
    if (!payload) {
      setValidationResult({ valid: false, error: "Invalid JWT format" });
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = payload.exp ? (payload.exp - now) : undefined;

    if (payload.exp && payload.exp < now) {
      setValidationResult({
        valid: false,
        payload,
        error: "Token has expired",
        expiresIn,
      });
    } else if (expiresIn !== undefined && expiresIn < 300) {
      setValidationResult({
        valid: true,
        payload,
        error: "Token expires in less than 5 minutes",
        expiresIn,
      });
    } else {
      setValidationResult({ valid: true, payload, expiresIn });
    }
  };

  const formatExpiryTime = (seconds: number) => {
    if (seconds < 0) return "Expired";
    const mins = Math.floor(seconds / 60);
    const hrs = Math.floor(mins / 60);
    if (hrs > 0) return `${hrs}h ${mins % 60}m`;
    return `${mins}m ${seconds % 60}s`;
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
          <Label htmlFor="jwt-token" className="text-sm font-medium">
            JWT Token <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <Textarea
              id="jwt-token"
              data-testid="input-jwt-token"
              placeholder="Paste your JWT token here..."
              className={`min-h-[120px] font-mono text-xs resize-none ${!showToken ? "text-security-disc" : ""}`}
              value={jwtToken}
              onChange={(e) => {
                onJwtTokenChange(e.target.value);
                setValidationResult(null);
              }}
              style={!showToken ? { WebkitTextSecurity: "disc" } as React.CSSProperties : {}}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
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
              variant="outline"
              size="sm"
              onClick={handleValidateToken}
              data-testid="button-validate-token"
            >
              <ShieldCheck className="h-4 w-4 mr-1" />
              Validate Token
            </Button>
          </div>
        </div>

        {validationResult && (
          <Alert variant={validationResult.valid && !validationResult.error ? "default" : "destructive"} className={validationResult.valid && !validationResult.error ? "border-primary/30 bg-primary/5" : ""}>
            <AlertDescription>
              <div className="space-y-2">
                {validationResult.error && (
                  <div className="flex items-center gap-2 font-medium">
                    <AlertTriangle className="h-4 w-4" />
                    {validationResult.error}
                  </div>
                )}
                {validationResult.valid && !validationResult.error && (
                  <div className="flex items-center gap-2 text-primary font-medium">
                    <ShieldCheck className="h-4 w-4" />
                    Token is valid
                  </div>
                )}
                {validationResult.payload && (
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    {validationResult.expiresIn !== undefined && (
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className="text-muted-foreground">Expires:</span>
                        <Badge variant="outline" size="sm">
                          {formatExpiryTime(validationResult.expiresIn)}
                        </Badge>
                      </div>
                    )}
                    {validationResult.payload.sub && (
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Subject:</span>
                        <span className="font-mono truncate max-w-[120px]">{validationResult.payload.sub}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
