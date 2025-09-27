import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { History, Undo2, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActionLogItem {
  id: string;
  action: string;
  args: Record<string, any>;
  createdAt: string;
}

interface HistoryResponse {
  items: ActionLogItem[];
}

export function AssistantHistory() {
  const [undoingIds, setUndoingIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch history
  const { data: historyData, isLoading } = useQuery<HistoryResponse>({
    queryKey: ['/api/assistant/history'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Undo mutation
  const undoMutation = useMutation({
    mutationFn: async (actionLogId: string) => {
      const response = await apiRequest('POST', '/api/assistant/undo', { actionLogId });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to undo action');
      }
      return response.json();
    },
    onMutate: (actionLogId: string) => {
      setUndoingIds(prev => new Set([...prev, actionLogId]));
    },
    onSuccess: (data, actionLogId) => {
      toast({
        title: "Action Undone",
        description: data.message,
      });
      // Refresh history
      queryClient.invalidateQueries({ queryKey: ['/api/assistant/history'] });
      setUndoingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionLogId);
        return newSet;
      });
    },
    onError: (error: Error, actionLogId) => {
      toast({
        title: "Undo Failed",
        description: error.message,
        variant: "destructive",
      });
      setUndoingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(actionLogId);
        return newSet;
      });
    },
  });

  const formatActionDescription = (action: string, args: Record<string, any>): string => {
    switch (action) {
      case 'bookAppointment':
        return `Booked appointment for ${args.clientName} (${args.serviceName}) on ${args.date} at ${args.time}`;
      case 'addClient':
        return `Added client ${args.name}`;
      case 'rescheduleAppointment':
        return `Rescheduled appointment to ${args.date} at ${args.time}`;
      case 'reminderSingle':
        return `Set reminder for ${args.clientName}`;
      case 'remindersBulkNextDay':
        return `Set bulk email reminders for tomorrow's appointments`;
      case 'createCoupon':
        return `Created coupon "${args.name}" (${args.amount}${args.type === 'percent' ? '%' : ''} off)`;
      case 'undo':
        return `Undone: ${args.originalAction}`;
      default:
        return action;
    }
  };

  const canUndo = (action: string): boolean => {
    // Can't undo an undo action, and some actions may not be undoable
    return action !== 'undo' && ['bookAppointment', 'addClient', 'reminderSingle', 'remindersBulkNextDay'].includes(action);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Action History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = historyData?.items || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="w-5 h-5" />
          Recent Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-muted-foreground text-sm">No recent actions found.</p>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div 
                key={item.id}
                className="flex items-start justify-between p-3 bg-muted/30 rounded-lg"
                data-testid={`history-item-${item.id}`}
              >
                <div className="flex-1">
                  <p className="text-sm font-medium">
                    {formatActionDescription(item.action, item.args)}
                  </p>
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                  </div>
                </div>
                {canUndo(item.action) && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => undoMutation.mutate(item.id)}
                    disabled={undoingIds.has(item.id) || undoMutation.isPending}
                    data-testid={`undo-${item.id}`}
                    className="ml-2"
                  >
                    {undoingIds.has(item.id) ? (
                      <>
                        <div className="w-3 h-3 animate-spin rounded-full border border-current border-t-transparent mr-1" />
                        Undoing...
                      </>
                    ) : (
                      <>
                        <Undo2 className="w-3 h-3 mr-1" />
                        Undo
                      </>
                    )}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}