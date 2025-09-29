import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Phone, MessageCircle, Gift, Plus, Megaphone } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  optInMarketing: boolean;
  createdAt: string;
  updatedAt: string;
}

interface ClientVisit {
  id: string;
  stylistId: string;
  clientId: string;
  appointmentId: string;
  visitDate: string;
  notes: string | null;
}

interface Coupon {
  id: string;
  name: string;
  type: string;
  amount: string;
  startDate: string;
  endDate: string;
}

interface ClientDetailsResponse {
  client: Client;
  visits: ClientVisit[];
  activeCoupons: Coupon[];
}

export default function ClientPage() {
  const [, params] = useRoute("/clients/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const clientId = params?.id;

  const { data, isLoading, error } = useQuery<ClientDetailsResponse>({
    queryKey: ["/api/clients", clientId, "visits"],
    enabled: !!clientId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-48"></div>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="h-64 bg-gray-200 rounded"></div>
              <div className="h-64 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center py-12">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Client Not Found</h1>
            <p className="text-gray-600 dark:text-gray-400 mb-6">The client you're looking for doesn't exist or you don't have access to it.</p>
            <Button onClick={() => setLocation("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { client, visits, activeCoupons } = data;

  const handleQuickAction = async (action: string) => {
    let prompt = "";
    
    switch (action) {
      case "reminder":
        prompt = `Send reminder to ${client.firstName} ${client.lastName}`;
        break;
      case "coupon":
        prompt = `Send coupon to ${client.firstName} ${client.lastName}`;
        break;
      case "note":
        prompt = `Add note for ${client.firstName} ${client.lastName}`;
        break;
      default:
        return;
    }
    
    setIsProcessing(true);
    
    try {
      const response = await apiRequest("POST", "/api/assistant/route", { 
        prompt: prompt.trim() 
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process request");
      }
      
      const result = await response.json();
      
      if (result.status === "confirm") {
        // Show confirmation toast for the action
        toast({
          title: "Action Ready",
          description: `${result.summary}. This would normally open a confirmation dialog.`,
        });
      } else if (result.status === "error") {
        toast({
          title: "Error",
          description: result.message || "Something went wrong",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Processing",
          description: result.message || "Request processed",
        });
      }
      
    } catch (error) {
      console.error("Error processing quick action:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      
      toast({
        title: "Action Failed", 
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800 p-4" data-testid="client-page">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/clients")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            {client.firstName} {client.lastName}
          </h1>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Client Profile */}
          <Card data-testid="card-profile">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                Profile Information
                {client.optInMarketing && (
                  <Badge variant="secondary" data-testid="badge-marketing">Marketing Opt-in</Badge>
                )}
              </CardTitle>
              <CardDescription>Basic client details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</p>
                <p className="text-lg" data-testid="text-name">
                  {client.firstName} {client.lastName}
                </p>
              </div>
              
              {client.email && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Email</p>
                  <p className="flex items-center gap-2" data-testid="text-email">
                    <Mail className="w-4 h-4" />
                    {client.email}
                  </p>
                </div>
              )}
              
              {client.phone && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone</p>
                  <p className="flex items-center gap-2" data-testid="text-phone">
                    <Phone className="w-4 h-4" />
                    {client.phone}
                  </p>
                </div>
              )}
              
              {client.notes && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Notes</p>
                  <p className="text-sm bg-gray-50 dark:bg-gray-800 rounded p-2" data-testid="text-notes">
                    {client.notes}
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Client Since</p>
                <p data-testid="text-created">
                  {new Date(client.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card data-testid="card-actions">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Perform common tasks for this client</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button
                className="justify-start"
                onClick={() => setLocation("/coupons/create")}
                data-testid="button-create-promotion"
              >
                <Megaphone className="w-4 h-4 mr-2" />
                Create Promotion
              </Button>

              <Button
                variant="outline"
                className="justify-start"
                onClick={() => handleQuickAction("reminder")}
                disabled={isProcessing}
                data-testid="button-send-reminder"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Send Reminder
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleQuickAction("coupon")}
                disabled={isProcessing}
                data-testid="button-send-coupon"
              >
                <Gift className="w-4 h-4 mr-2" />
                Send Coupon
              </Button>
              
              <Button 
                variant="outline" 
                className="justify-start"
                onClick={() => handleQuickAction("note")}
                disabled={isProcessing}
                data-testid="button-add-note"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Note
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Visit History */}
        <Card className="mt-6" data-testid="card-visits">
          <CardHeader>
            <CardTitle>Visit History</CardTitle>
            <CardDescription>
              {visits.length} visit{visits.length !== 1 ? 's' : ''} on record
            </CardDescription>
          </CardHeader>
          <CardContent>
            {visits.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No visits recorded yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {visits.map((visit, index) => (
                  <div key={visit.id} data-testid={`visit-${visit.id}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium" data-testid={`text-visit-date-${visit.id}`}>
                          {new Date(visit.visitDate).toLocaleDateString()}
                        </p>
                        {visit.notes && (
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {visit.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    {index < visits.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Promotions */}
        {activeCoupons.length > 0 && (
          <Card className="mt-6" data-testid="card-promotions">
            <CardHeader>
              <CardTitle>Available Promotions</CardTitle>
              <CardDescription>Active coupons that can be sent to this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {activeCoupons.map((coupon) => (
                  <div 
                    key={coupon.id}
                    className="border rounded-lg p-3"
                    data-testid={`coupon-${coupon.id}`}
                  >
                    <h4 className="font-medium">{coupon.name}</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {coupon.type === 'percent' ? `${coupon.amount}% off` : `$${coupon.amount} off`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      Valid until {new Date(coupon.endDate).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}