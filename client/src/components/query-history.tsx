import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw, Trash2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { QueryHistory } from "@shared/schema";

interface QueryHistoryPanelProps {
  history: QueryHistory[];
  onReload: (query: QueryHistory) => void;
  onClear: () => void;
}

export function QueryHistoryPanel({ history, onReload, onClear }: QueryHistoryPanelProps) {
  if (history.length === 0) {
    return (
      <Card className="border-card-border">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-primary" />
            Query History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <div className="p-3 rounded-full bg-muted mb-3">
              <History className="h-6 w-6" />
            </div>
            <p className="text-sm">No queries yet</p>
            <p className="text-xs mt-1">Your recent queries will appear here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-card-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <History className="h-4 w-4 text-primary" />
            Query History
            <Badge variant="secondary" size="sm">{history.length}</Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="text-muted-foreground"
            data-testid="button-clear-history"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px]">
          <div className="space-y-2">
            {history.map((query) => (
              <div
                key={query.id}
                className="p-3 rounded-md border border-border bg-muted/30 hover-elevate cursor-pointer"
                onClick={() => onReload(query)}
                data-testid={`history-item-${query.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant={query.environment === "production" ? "default" : "secondary"}
                        size="sm"
                      >
                        {query.environment === "production" ? "PROD" : "INT"}
                      </Badge>
                      <Badge
                        variant={query.status === "success" ? "outline" : "destructive"}
                        size="sm"
                      >
                        {query.status}
                      </Badge>
                      {query.documentCount && (
                        <span className="text-xs text-muted-foreground">
                          {query.documentCount} docs
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-muted-foreground truncate">
                      {query.patientIdentifier}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {query.createdAt && formatDistanceToNow(new Date(query.createdAt), { addSuffix: true })}
                      {query.responseTime && (
                        <span className="text-primary">{query.responseTime}ms</span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onReload(query);
                    }}
                    data-testid={`button-reload-${query.id}`}
                  >
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
