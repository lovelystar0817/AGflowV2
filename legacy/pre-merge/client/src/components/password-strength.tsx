import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface PasswordStrengthProps {
  password: string;
  show: boolean;
}

interface PasswordRule {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: "At least 8 characters",
    test: (password) => password.length >= 8,
  },
  {
    id: "uppercase",
    label: "One uppercase letter",
    test: (password) => /[A-Z]/.test(password),
  },
  {
    id: "lowercase",
    label: "One lowercase letter", 
    test: (password) => /[a-z]/.test(password),
  },
  {
    id: "number",
    label: "One number",
    test: (password) => /[0-9]/.test(password),
  },
  {
    id: "special",
    label: "One special character (!@#$%^&*)",
    test: (password) => /[!@#$%^&*]/.test(password),
  },
];

export function PasswordStrength({ password, show }: PasswordStrengthProps) {
  if (!show) return null;

  return (
    <div className="mt-3 p-4 bg-muted/50 rounded-lg border" data-testid="password-strength-checklist">
      <h4 className="text-sm font-medium text-foreground mb-3">Password Requirements:</h4>
      <div className="space-y-2">
        {passwordRules.map((rule) => {
          const isValid = rule.test(password);
          return (
            <div
              key={rule.id}
              className="flex items-center space-x-2"
              data-testid={`password-rule-${rule.id}`}
            >
              <div
                className={cn(
                  "flex items-center justify-center w-4 h-4 rounded-full text-xs",
                  isValid
                    ? "bg-green-500 text-white"
                    : "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                )}
              >
                {isValid ? (
                  <Check className="w-3 h-3" data-testid={`check-${rule.id}`} />
                ) : (
                  <X className="w-3 h-3" data-testid={`x-${rule.id}`} />
                )}
              </div>
              <span
                className={cn(
                  "text-sm",
                  isValid
                    ? "text-green-700 dark:text-green-400"
                    : "text-gray-600 dark:text-gray-400"
                )}
              >
                {rule.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}