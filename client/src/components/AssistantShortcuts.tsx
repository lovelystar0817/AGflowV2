import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Calendar, 
  Clock, 
  Settings, 
  Bell, 
  Tag, 
  Mail,
  Plus,
  Repeat,
  Shield
} from "lucide-react";

interface Shortcut {
  id: string;
  label: string;
  prompt?: string;
  icon: React.ReactNode;
  action: 'prompt' | 'form';
  formType?: string;
}

interface ShortcutGroup {
  title: string;
  shortcuts: Shortcut[];
}

interface AssistantShortcutsProps {
  onPromptClick: (prompt: string) => void;
  onFormOpen: (formType: string) => void;
}

export function AssistantShortcuts({ onPromptClick, onFormOpen }: AssistantShortcutsProps) {
  const [expandedGroup, setExpandedGroup] = useState<string | null>("clients");

  const shortcutGroups: ShortcutGroup[] = [
    {
      title: "Clients",
      shortcuts: [
        {
          id: "add-client",
          label: "Add Client",
          prompt: "Add a new client",
          icon: <Plus className="w-4 h-4" />,
          action: "prompt"
        }
      ]
    },
    {
      title: "Scheduling", 
      shortcuts: [
        {
          id: "book",
          label: "Book",
          prompt: "Book an appointment",
          icon: <Calendar className="w-4 h-4" />,
          action: "prompt"
        },
        {
          id: "reschedule",
          label: "Reschedule",
          prompt: "Reschedule an appointment",
          icon: <Repeat className="w-4 h-4" />,
          action: "prompt"
        },
        {
          id: "block-time",
          label: "Block Time",
          prompt: "Block time on my schedule",
          icon: <Shield className="w-4 h-4" />,
          action: "prompt"
        },
        {
          id: "set-hours",
          label: "Set Hours",
          prompt: "Update my business hours",
          icon: <Clock className="w-4 h-4" />,
          action: "prompt"
        }
      ]
    },
    {
      title: "Reminders/Marketing",
      shortcuts: [
        {
          id: "reminder",
          label: "Reminder",
          prompt: "Send a reminder",
          icon: <Bell className="w-4 h-4" />,
          action: "prompt"
        },
        {
          id: "bulk-reminders",
          label: "Bulk Reminders", 
          prompt: "Send bulk reminders",
          icon: <Mail className="w-4 h-4" />,
          action: "prompt"
        },
        {
          id: "create-coupon",
          label: "Create Coupon",
          prompt: "Create a new coupon",
          icon: <Tag className="w-4 h-4" />,
          action: "prompt"
        },
        {
          id: "send-coupon",
          label: "Send Coupon",
          prompt: "Send a coupon to clients",
          icon: <Users className="w-4 h-4" />,
          action: "prompt"
        }
      ]
    }
  ];

  const handleShortcutClick = (shortcut: Shortcut) => {
    if (shortcut.action === 'prompt' && shortcut.prompt) {
      onPromptClick(shortcut.prompt);
    } else if (shortcut.action === 'form' && shortcut.formType) {
      onFormOpen(shortcut.formType);
    }
  };

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroup(expandedGroup === groupTitle ? null : groupTitle);
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">AI Assistant</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Quick actions and shortcuts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {shortcutGroups.map((group) => (
          <div key={group.title} className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-between p-2 h-auto font-medium"
              onClick={() => toggleGroup(group.title)}
              data-testid={`toggle-${group.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
            >
              <span className="text-sm">{group.title}</span>
              <Badge variant="secondary" className="text-xs">
                {group.shortcuts.length}
              </Badge>
            </Button>
            
            {expandedGroup === group.title && (
              <div className="space-y-1 pl-2">
                {group.shortcuts.map((shortcut) => (
                  <Button
                    key={shortcut.id}
                    variant="outline"
                    size="sm"
                    className="w-full justify-start h-8 text-xs"
                    onClick={() => handleShortcutClick(shortcut)}
                    data-testid={`shortcut-${shortcut.id}`}
                  >
                    {shortcut.icon}
                    <span className="ml-2">{shortcut.label}</span>
                  </Button>
                ))}
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}