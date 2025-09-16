import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Loader2, Sparkles, CheckCircle, AlertCircle, Info, ChevronDown } from "lucide-react";
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
  const [isHelpOpen, setIsHelpOpen] = useState(false);
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

  const examplePrompts = [
    {
      category: "Services & Coupons",
      prompts: [
        "Send a $20 coupon to inactive clients",
        "Create a $10 discount for new clients",
        "Send follow-up to clients who came last week"
      ]
    },
    {
      category: "Scheduling",
      prompts: [
        "Book Ashley for color on Friday at 3pm",
        "Block off tomorrow afternoon",
        "Update my hours next week to 10–5"
      ]
    },
    {
      category: "Analytics",
      prompts: [
        "Show me my top 5 clients",
        "How many bookings did I get last month?",
        "Who hasn't visited in 6 weeks?"
      ]
    },
    {
      category: "Availability Suggestions",
      prompts: [
        "Find the best slots for haircuts this week",
        "When can I fit in 3 new clients?"
      ]
    },
    {
      category: "Reminders & Notifications",
      prompts: [
        "Send birthday wishes to Sarah",
        "Follow up with no-show clients",
        "Remind regulars to rebook"
      ]
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6">
          {/* What Can I Ask? Section */}
          <Collapsible open={isHelpOpen} onOpenChange={setIsHelpOpen} className="mb-6">
            <CollapsibleTrigger asChild>
              <button 
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-3"
                onClick={() => setIsHelpOpen(!isHelpOpen)}
              >
                <Info className="h-4 w-4" />
                <span>What Can I Ask?</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isHelpOpen ? 'rotate-180' : ''}`} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4">
              <div className="bg-muted/50 rounded-md p-4 space-y-4">
                {examplePrompts.map((section, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-medium text-sm text-foreground">{section.category}</h4>
                    <ul className="space-y-1">
                      {section.prompts.map((prompt, promptIndex) => (
                        <li key={promptIndex} className="text-sm text-muted-foreground pl-2">
                          • "{prompt}"
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium">🎯 Pro Tip:</span>{" "}
                    <em>You can talk to the assistant naturally — just type what you'd say out loud!</em>
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
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