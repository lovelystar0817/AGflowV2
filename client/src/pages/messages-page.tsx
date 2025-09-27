import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { 
  MessageCircle, 
  Search, 
  Send, 
  MoreVertical, 
  Clock,
  CheckCheck,
  Star
} from "lucide-react";

export function MessagesPage() {
  // Mock data for demonstration
  const conversations = [
    {
      id: 1,
      clientName: "Sarah Johnson",
      lastMessage: "Thank you for the great haircut! Can we schedule another appointment?",
      timestamp: "2 min ago",
      unread: true,
      avatar: null,
      status: "online"
    },
    {
      id: 2,
      clientName: "Mike Chen",
      lastMessage: "I'm interested in your landscaping services. What's your availability?",
      timestamp: "1 hour ago",
      unread: false,
      avatar: null,
      status: "offline"
    },
    {
      id: 3,
      clientName: "Emma Davis",
      lastMessage: "The house cleaning was perfect! Will book again soon.",
      timestamp: "Yesterday",
      unread: false,
      avatar: null,
      status: "online"
    }
  ];

  const currentMessages = [
    {
      id: 1,
      sender: "client",
      name: "Sarah Johnson",
      message: "Hi! I loved my haircut last week. Do you have any openings this Friday?",
      timestamp: "10:30 AM",
      delivered: true
    },
    {
      id: 2,
      sender: "me",
      name: "You",
      message: "Hi Sarah! So glad you loved it! Let me check my schedule for Friday.",
      timestamp: "10:32 AM",
      delivered: true
    },
    {
      id: 3,
      sender: "me",
      name: "You", 
      message: "I have a 2 PM and 4 PM slot available on Friday. Which works better for you?",
      timestamp: "10:33 AM",
      delivered: true
    },
    {
      id: 4,
      sender: "client",
      name: "Sarah Johnson",
      message: "Thank you for the great haircut! Can we schedule another appointment?",
      timestamp: "Just now",
      delivered: false
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Conversations List */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Messages</h2>
            <Button size="sm" variant="outline">
              <MessageCircle className="h-4 w-4 mr-2" />
              New
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input 
              placeholder="Search conversations..." 
              className="pl-10"
              data-testid="input-search-conversations"
            />
          </div>
        </div>
        
        <ScrollArea className="h-[calc(100vh-120px)]">
          <div className="p-2">
            {conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`p-3 rounded-lg cursor-pointer transition-colors mb-2 ${
                  conversation.id === 1 
                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' 
                    : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
                data-testid={`conversation-${conversation.id}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="relative">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={conversation.avatar || undefined} />
                      <AvatarFallback>
                        {conversation.clientName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    {conversation.status === 'online' && (
                      <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm text-gray-900 dark:text-gray-100">
                        {conversation.clientName}
                      </p>
                      <span className="text-xs text-gray-500">
                        {conversation.timestamp}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate mt-1">
                      {conversation.lastMessage}
                    </p>
                    {conversation.unread && (
                      <div className="flex justify-end mt-2">
                        <Badge variant="default" className="h-5 px-2 text-xs">
                          New
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Message Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={undefined} />
                <AvatarFallback>SJ</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Sarah Johnson</h3>
                <p className="text-sm text-gray-500">Online • Last seen 2 min ago</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="sm">
                <Star className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {currentMessages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    message.sender === 'me'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                  }`}
                  data-testid={`message-${message.id}`}
                >
                  <p className="text-sm">{message.message}</p>
                  <div className={`flex items-center justify-end space-x-1 mt-1 ${
                    message.sender === 'me' ? 'text-blue-100' : 'text-gray-500'
                  }`}>
                    <span className="text-xs">{message.timestamp}</span>
                    {message.sender === 'me' && (
                      <CheckCheck className={`h-3 w-3 ${message.delivered ? 'text-blue-200' : 'text-blue-300'}`} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Message Input */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              <Textarea
                placeholder="Type your message..."
                className="min-h-[60px] resize-none"
                data-testid="textarea-message-input"
              />
            </div>
            <Button size="icon" className="h-[60px] w-12" data-testid="button-send-message">
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
            <div className="flex items-center space-x-4">
              <span>Sarah is typing...</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="h-3 w-3" />
              <span>Messages are end-to-end encrypted</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MessagesPage;