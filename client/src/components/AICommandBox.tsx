import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, CheckCircle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface AIExecutionResult {
  success: boolean;
  action: string;
  details: string;
  count?: number;
  error?: string;
}

export function AICommandBox() {
  const [command, setCommand] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AIExecutionResult | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!command.trim()) {
      toast({
        title: "Command Required",
        description: "Please enter a command for the AI to execute.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);

    try {
      const response = await apiRequest("POST", "/api/ai/execute", { command: command.trim() });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to execute AI command");
      }

      const data: AIExecutionResult = await response.json();
      setResult(data);

      if (data.success) {
        toast({
          title: "AI Command Executed",
          description: data.action,
        });
      }
    } catch (error) {
      console.error("Error executing AI command:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setResult({
        success: false,
        action: "Command Failed",
        details: errorMessage,
        error: errorMessage
      });

      toast({
        title: "Command Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setCommand("");
    setResult(null);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            AI Command Center
          </CardTitle>
          <CardDescription>
            Tell the AI what you want to do with natural language. For example: "Send $20 coupon to inactive clients" or "Show me clients who haven't visited in 6 weeks"
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Textarea
                placeholder="Type your command here... (e.g., 'Send $20 coupon to inactive clients')"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="min-h-[120px] text-base"
                disabled={isLoading}
                data-testid="input-ai-command"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                type="submit" 
                disabled={isLoading || !command.trim()}
                className="min-w-[100px]"
                data-testid="button-run-ai-command"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Run
                  </>
                )}
              </Button>
              {(command || result) && (
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleClear}
                  disabled={isLoading}
                  data-testid="button-clear-ai-command"
                >
                  Clear
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {result && (
        <Card className={`border-l-4 ${
          result.success 
            ? "border-l-green-500 bg-green-50 dark:bg-green-950/20" 
            : "border-l-red-500 bg-red-50 dark:bg-red-950/20"
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              {result.success ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600" />
              )}
              {result.action}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <p className="text-sm text-muted-foreground mb-2">
              {result.details}
            </p>
            {result.count !== undefined && (
              <p className="text-sm font-medium">
                Items affected: {result.count}
              </p>
            )}
            {result.error && (
              <p className="text-sm text-red-600 mt-2">
                Error: {result.error}
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}