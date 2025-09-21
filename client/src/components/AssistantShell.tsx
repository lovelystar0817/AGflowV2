import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Sparkles, CheckCircle, AlertCircle, Info, HelpCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { AssistantShortcuts } from "./AssistantShortcuts";

interface AssistantResult {
  status: "confirm" | "needs_clarification" | "error";
  action?: string;
  args?: Record<string, any>;
  summary?: string;
  message?: string;
  question?: string;
  context?: Record<string, any>;
}

interface ExecutionResult {
  success: boolean;
  message: string;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  summary: string;
  action: string;
  isLoading: boolean;
}

function ConfirmationModal({ isOpen, onClose, onConfirm, summary, action, isLoading }: ConfirmationModalProps) {
  // Check if this is a reminder action
  const isReminderAction = action && (action.includes('reminder') || action.includes('Reminder'));
  
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent data-testid="confirmation-modal">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-500" />
            {isReminderAction ? 'Confirm Email Reminder?' : 'Confirm Action'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isReminderAction ? (
              <div className="bg-muted p-3 rounded-md">
                {summary}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <strong>Action:</strong> {action}
                </div>
                <div className="bg-muted p-3 rounded-md">
                  <strong>Summary:</strong> {summary}
                </div>
              </div>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={onClose} 
            disabled={isLoading}
            data-testid="cancel-action"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            disabled={isLoading}
            data-testid="confirm-action"
            className="min-w-[100px]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                Executing...
              </>
            ) : (
              isReminderAction ? "Send Email" : "Confirm"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function AssistantShell() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AssistantResult | null>(null);
  const [executionResult, setExecutionResult] = useState<ExecutionResult | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [clarificationAnswer, setClarificationAnswer] = useState("");
  const [errorCount, setErrorCount] = useState(0);
  const [pendingAction, setPendingAction] = useState<{action: string, args: Record<string, any>} | null>(null);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await processPrompt(prompt.trim());
  };

  const processPrompt = async (inputPrompt: string) => {
    if (!inputPrompt) {
      toast({
        title: "Prompt Required",
        description: "Please enter a command for the AI assistant.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    setResult(null);
    setExecutionResult(null);

    try {
      const response = await apiRequest("POST", "/api/assistant/route", { prompt: inputPrompt });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process prompt");
      }

      const data: AssistantResult = await response.json();
      setResult(data);
      setErrorCount(0);

      if (data.status === "confirm" && data.action && data.args) {
        setPendingAction({ action: data.action, args: data.args });
        setShowConfirmModal(true);
      } else if (data.status === "needs_clarification") {
        // Handle clarification inline
        // The question will be shown in the result display
      } else if (data.status === "error") {
        // Handle error case
        setErrorCount(prev => prev + 1);
        if (errorCount >= 1) {
          // After 2 errors, fall back to forms
          handleFallbackToForm(data.action);
        }
      }
    } catch (error) {
      console.error("Error processing prompt:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setResult({
        status: "error",
        message: errorMessage
      });

      setErrorCount(prev => prev + 1);
      if (errorCount >= 1) {
        // After 2 errors, fall back to forms
        handleFallbackToForm();
      }

      toast({
        title: "Processing Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClarificationSubmit = async () => {
    if (!clarificationAnswer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please provide an answer to the clarification question.",
        variant: "destructive",
      });
      return;
    }

    const combinedPrompt = `${prompt} ${clarificationAnswer.trim()}`;
    setClarificationAnswer("");
    await processPrompt(combinedPrompt);
  };

  const handleConfirmAction = async () => {
    if (!pendingAction) return;

    setIsExecuting(true);

    try {
      const response = await apiRequest("POST", "/api/assistant/confirm", {
        action: pendingAction.action,
        args: pendingAction.args,
        idempotencyKey: `${Date.now()}-${Math.random()}`
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to execute action");
      }

      const data: ExecutionResult = await response.json();
      setExecutionResult(data);
      
      if (data.success) {
        toast({
          title: "Action Executed",
          description: data.message,
        });
      } else {
        toast({
          title: "Action Failed",
          description: data.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error executing action:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      setExecutionResult({
        success: false,
        message: errorMessage
      });

      toast({
        title: "Execution Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsExecuting(false);
      setShowConfirmModal(false);
      setPendingAction(null);
    }
  };

  const handleFallbackToForm = (actionType?: string) => {
    // This would open the appropriate form based on the action type
    // For now, just show a toast indicating fallback
    toast({
      title: "Opening Form",
      description: `Opening fallback form for ${actionType || 'this action'}`,
      variant: "default",
    });
  };

  const handlePromptClick = (newPrompt: string) => {
    setPrompt(newPrompt);
  };

  const handleFormOpen = (formType: string) => {
    // Handle opening forms
    toast({
      title: "Opening Form",
      description: `Opening ${formType} form`,
    });
  };

  const handleClear = () => {
    setPrompt("");
    setResult(null);
    setExecutionResult(null);
    setClarificationAnswer("");
    setErrorCount(0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Shortcuts Panel */}
        <div className="md:col-span-1 order-1 md:order-1">
          <AssistantShortcuts 
            onPromptClick={handlePromptClick}
            onFormOpen={handleFormOpen}
          />
        </div>

        {/* Main Command Interface */}
        <div className="md:col-span-3 order-2 md:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-500" />
                AI Assistant
              </CardTitle>
              <CardDescription>
                Describe what you'd like to do, and I'll help you get it done.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Command Input */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prompt">What would you like to do?</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Book Ashley for color Friday 3pm"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    data-testid="assistant-prompt"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={isLoading}
                    data-testid="submit-prompt"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Process
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleClear}
                    disabled={isLoading}
                    data-testid="clear-prompt"
                  >
                    Clear
                  </Button>
                </div>
              </form>

              {/* Clarification Question */}
              {result?.status === "needs_clarification" && (
                <Alert>
                  <HelpCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-3">
                      <p>{result.question}</p>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Your answer..."
                          value={clarificationAnswer}
                          onChange={(e) => setClarificationAnswer(e.target.value)}
                          data-testid="clarification-answer"
                        />
                        <Button 
                          onClick={handleClarificationSubmit}
                          disabled={isLoading}
                          data-testid="submit-clarification"
                        >
                          Submit
                        </Button>
                      </div>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* Results Display */}
              {result && result.status !== "needs_clarification" && (
                <div className="space-y-3">
                  {result.status === "confirm" && (
                    <Alert>
                      <Info className="h-4 w-4" />
                      <AlertDescription>
                        I understand you want to: {result.summary}
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {result.status === "error" && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        {result.message}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}

              {/* Execution Results */}
              {executionResult && (
                <Alert variant={executionResult.success ? "default" : "destructive"}>
                  {executionResult.success ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                  <AlertDescription>
                    {executionResult.message}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmAction}
        summary={result?.summary || ""}
        action={result?.action || ""}
        isLoading={isExecuting}
      />
    </div>
  );
}