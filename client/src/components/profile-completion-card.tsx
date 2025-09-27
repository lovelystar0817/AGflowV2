import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, User, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ProfileCompletionCardProps {
  onDismiss?: () => void;
}

export function ProfileCompletionCard({ onDismiss }: ProfileCompletionCardProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [, navigate] = useLocation();
  const { user } = useAuth();

  const handleCompleteProfile = () => {
    navigate("/profile-setup");
  };

  const handleDismiss = () => {
    setIsVisible(false);
    if (user?.id) {
      localStorage.setItem(`profile-completion-dismissed-${user.id}`, "true");
    }
    onDismiss?.();
  };

  // Check if card was previously dismissed for this user
  useEffect(() => {
    if (user?.id) {
      const dismissed = localStorage.getItem(`profile-completion-dismissed-${user.id}`) === "true";
      setIsVisible(!dismissed);
    } else {
      // Reset to visible when no user (during login/logout transitions)
      setIsVisible(true);
    }
  }, [user?.id]);

  if (!isVisible) {
    return null;
  }

  return (
    <Alert className="relative mb-4 sm:mb-6 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 shadow-enhanced animate-slide-in" data-testid="alert-profile-completion">
      <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
      <AlertDescription className="pr-2 sm:pr-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <span className="font-medium text-amber-800 dark:text-amber-200 text-sm sm:text-base">
              Complete your profile to attract more clients
            </span>
            <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300 mt-1">
              Add your contact info, services, and business hours to get started.
            </p>
          </div>
          <div className="flex items-center space-x-2 sm:ml-4 flex-shrink-0">
            <Button
              onClick={handleCompleteProfile}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white transition-enhanced hover-lift text-xs sm:text-sm flex-shrink-0"
              data-testid="button-complete-profile"
            >
              <User className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">Complete Profile</span>
              <span className="xs:hidden">Complete</span>
            </Button>
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="icon"
              className="h-6 w-6 sm:h-8 sm:w-8 text-amber-600 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:text-amber-200 transition-enhanced hover-lift"
              data-testid="button-dismiss"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  );
}