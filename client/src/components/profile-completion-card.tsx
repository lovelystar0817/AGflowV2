import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, User, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";

interface ProfileCompletionCardProps {
  onDismiss?: () => void;
}

export function ProfileCompletionCard({ onDismiss }: ProfileCompletionCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [, navigate] = useLocation();

  const handleCompleteProfile = () => {
    navigate("/profile-setup");
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("profile-completion-dismissed", "true");
    onDismiss?.();
  };

  // Check if card was previously dismissed
  useEffect(() => {
    const dismissed = localStorage.getItem("profile-completion-dismissed");
    if (dismissed === "true") {
      setIsVisible(false);
    }
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <Alert className="relative mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20" data-testid="alert-profile-completion">
      <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
      <AlertDescription className="pr-8">
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium text-amber-800 dark:text-amber-200">
              Complete your profile to attract more clients
            </span>
            <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
              Add your contact info, services, and business hours to get started.
            </p>
          </div>
          <div className="flex items-center space-x-2 ml-4">
            <Button
              onClick={handleCompleteProfile}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              data-testid="button-complete-profile"
            >
              <User className="mr-2 h-4 w-4" />
              Complete Profile
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200"
              data-testid="button-dismiss"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}