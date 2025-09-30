import React from "react";
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
  // minimal mock while API loads
  const fallbackConversations = [
    { id: 'c-1', clientName: 'Sarah Johnson', lastMessage: 'Thanks for the cut!', timestamp: '2 min ago', unread: true, avatar: null, status: 'online' }
  ];
  const fallbackMessages = [
    { id: 'm-1', sender: 'client', name: 'Sarah Johnson', message: 'Hi! Available Friday?', timestamp: '10:30 AM', delivered: true }
  ];

  const [conversations, setConversations] = React.useState(fallbackConversations);
  const [currentMessages, setCurrentMessages] = React.useState(fallbackMessages);

  React.useEffect(() => {
    let mounted = true;
    fetch('/api/messages')
      .then(res => res.ok ? res.json() : Promise.reject(res))
      .then(data => {
        // API may return { messages: [...] } or an array of conversations
        const convs = Array.isArray(data) ? data : (data?.conversations ?? data?.threads ?? []);
        const mapped = convs.map((c: any, idx: number) => ({
          id: c.id ?? `conv-${idx}`,
          clientName: c.clientName ?? c.name ?? c.with ?? 'Unknown',
          lastMessage: c.lastMessage ?? c.preview ?? '',
          timestamp: c.updatedAt ? new Date(c.updatedAt).toLocaleString() : (c.timestamp ?? ''),
          unread: Boolean(c.unreadCount),
          avatar: c.avatar ?? null,
          status: c.status ?? 'offline',
        }));
        if (mounted && mapped.length > 0) setConversations(mapped);

        // If API includes a messages array for the active conversation, map that too
        const msgs = data?.messages ?? data?.currentMessages ?? [];
        if (Array.isArray(msgs) && msgs.length > 0) {
          const mappedMsgs = msgs.map((m: any, i: number) => ({
            id: m.id ?? `msg-${i}`,
            sender: m.sender === 'me' || m.from === 'me' ? 'me' : 'client',
            name: m.name ?? m.senderName ?? '',
            message: m.body ?? m.content ?? m.text ?? '',
            timestamp: m.timestamp ? new Date(m.timestamp).toLocaleTimeString() : (m.time ?? ''),
            delivered: m.delivered ?? true,
          }));
          if (mounted) setCurrentMessages(mappedMsgs);
        }
      })
      .catch(() => {
        // keep fallback data on failure
      });
    return () => { mounted = false; };
  }, []);

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
                  conversation.id === 'c-1' 
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