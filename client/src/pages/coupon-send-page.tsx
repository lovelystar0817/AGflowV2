import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { 
  couponDeliveryFormSchema,
  MESSAGE_TEMPLATES,
  MESSAGE_TEMPLATE_LABELS,
  replaceMessagePlaceholders,
  type Coupon,
  type Client,
  type StylistService,
  type MessageTemplateKey,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Users, User, Brain, Calendar, CheckCircle, MessageSquare } from "lucide-react";
import { z } from "zod";

type CouponDeliveryFormData = z.infer<typeof couponDeliveryFormSchema>;

export default function CouponSendPage() {
  const { id: couponId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch coupon details
  const { data: coupon, isLoading: couponLoading, error: couponError } = useQuery<Coupon>({
    queryKey: ["/api/coupons", couponId],
    queryFn: async () => {
      const response = await fetch(`/api/coupons/${couponId}`);
      if (!response.ok) throw new Error("Failed to fetch coupon");
      return response.json();
    },
    enabled: !!couponId,
  });

  // Fetch clients for targeting
  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Fetch services for coupon context
  const { data: services } = useQuery<StylistService[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<CouponDeliveryFormData>({
    resolver: zodResolver(couponDeliveryFormSchema),
    defaultValues: {
      couponId: couponId || "",
      recipientType: "all",
      clientIds: [],
      messageTemplate: "general_promo",
      message: "",
    },
  });

  const sendCouponMutation = useMutation({
    mutationFn: async (data: CouponDeliveryFormData) => {
      const deliveryData = {
        couponId: data.couponId,
        recipientType: data.recipientType,
        clientIds: data.clientIds || [],
        logicRule: data.logicRule,
        message: data.message,
        // Send now by default (scheduledAt will be set to current time on backend)
      };

      const response = await apiRequest("POST", "/api/coupon-deliveries", deliveryData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupon-deliveries"] });
      toast({
        title: "Coupon sent successfully!",
        description: "Your coupon has been delivered to the selected clients.",
      });
      navigate("/"); // Navigate back to dashboard
    },
    onError: (error: Error) => {
      toast({
        title: "Error sending coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CouponDeliveryFormData) => {
    sendCouponMutation.mutate(data);
  };

  const watchRecipientType = form.watch("recipientType");
  const watchClientIds = form.watch("clientIds");
  const watchMessageTemplate = form.watch("messageTemplate");
  const watchMessage = form.watch("message");

  // Get target service name for display
  const getTargetServiceName = () => {
    if (!coupon?.serviceId || !services) return "All Services";
    const service = services.find(s => s.id === coupon.serviceId);
    return service ? service.serviceName : "All Services";
  };

  // Calculate recipient count
  const getRecipientCount = () => {
    if (!clients) return 0;
    
    switch (watchRecipientType) {
      case "all":
        return clients.length;
      case "custom":
        return watchClientIds?.length || 0;
      case "logic":
        // For logic-based, we'll show estimated count
        return Math.floor(clients.length * 0.3); // Rough estimate
      default:
        return 0;
    }
  };

  // Handle template selection and auto-populate message
  const handleTemplateChange = (templateKey: MessageTemplateKey) => {
    if (!coupon) return;

    const template = MESSAGE_TEMPLATES[templateKey];
    const service = coupon.serviceId && services 
      ? services.find(s => s.id === coupon.serviceId)
      : undefined;
    
    const populatedMessage = replaceMessagePlaceholders(template, coupon, service);
    
    form.setValue("messageTemplate", templateKey);
    form.setValue("message", populatedMessage);
  };

  if (couponLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading coupon...</p>
        </div>
      </div>
    );
  }

  if (couponError || !coupon) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <p className="text-lg font-semibold">Failed to load coupon</p>
            <p className="text-sm text-muted-foreground mt-2">
              {couponError?.message || "Coupon not found"}
            </p>
          </div>
          <Button onClick={() => navigate("/")} data-testid="button-back-to-dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/")}
                data-testid="button-back"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold">Send Coupon</h1>
                <p className="text-sm text-muted-foreground">Choose who receives this coupon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Coupon Preview */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Coupon Preview</CardTitle>
                <CardDescription>Review your coupon details</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold text-lg" data-testid="text-coupon-name">{coupon.name}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge variant="secondary">
                      {coupon.type === "percent" ? `${coupon.amount}% OFF` : `$${coupon.amount} OFF`}
                    </Badge>
                  </div>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Target Service:</span>
                    <span>{getTargetServiceName()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Valid From:</span>
                    <span>{coupon.startDate}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Expires:</span>
                    <span>{coupon.endDate}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recipient Summary */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Users className="h-5 w-5" />
                  <span>Recipients</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary" data-testid="text-recipient-count">
                    {getRecipientCount()}
                  </div>
                  <p className="text-sm text-muted-foreground">clients will receive this coupon</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Delivery Form */}
          <div className="lg:col-span-2">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                {/* Targeting Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Choose Recipients</CardTitle>
                    <CardDescription>
                      Select who should receive this coupon
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FormField
                      control={form.control}
                      name="recipientType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Targeting Method</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-recipient-type">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">
                                <div className="flex items-center space-x-2">
                                  <Users className="h-4 w-4" />
                                  <span>All Clients</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="custom">
                                <div className="flex items-center space-x-2">
                                  <User className="h-4 w-4" />
                                  <span>Selected Clients</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="logic">
                                <div className="flex items-center space-x-2">
                                  <Brain className="h-4 w-4" />
                                  <span>Scheduled</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Custom Client Selection */}
                    {watchRecipientType === "custom" && (
                      <FormField
                        control={form.control}
                        name="clientIds"
                        render={() => (
                          <FormItem>
                            <FormLabel>Select Clients</FormLabel>
                            <FormDescription>
                              Choose specific clients to receive this coupon
                            </FormDescription>
                            <FormControl>
                              <div className="space-y-4 max-h-60 overflow-y-auto border rounded-lg p-4">
                                {clientsLoading ? (
                                  <p className="text-sm text-muted-foreground">Loading clients...</p>
                                ) : clients && clients.length > 0 ? (
                                  clients.map((client) => (
                                    <div key={client.id} className="flex items-center space-x-2">
                                      <Checkbox
                                        id={client.id}
                                        checked={watchClientIds?.includes(client.id) || false}
                                        onCheckedChange={(checked) => {
                                          const currentIds = watchClientIds || [];
                                          if (checked) {
                                            form.setValue("clientIds", [...currentIds, client.id]);
                                          } else {
                                            form.setValue("clientIds", currentIds.filter(id => id !== client.id));
                                          }
                                        }}
                                        data-testid={`checkbox-client-${client.id}`}
                                      />
                                      <label
                                        htmlFor={client.id}
                                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex-1"
                                      >
                                        {client.firstName} {client.lastName}
                                        {client.email && (
                                          <span className="text-muted-foreground ml-2">({client.email})</span>
                                        )}
                                      </label>
                                    </div>
                                  ))
                                ) : (
                                  <p className="text-sm text-muted-foreground">No clients found. Add clients to your account first.</p>
                                )}
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Logic-Based Targeting */}
                    {watchRecipientType === "logic" && (
                      <FormField
                        control={form.control}
                        name="logicRule"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Targeting Rule</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-logic-rule">
                                  <SelectValue placeholder="Choose targeting rule" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="first_time">
                                  <div>
                                    <div className="font-medium">First-Time Clients</div>
                                    <div className="text-sm text-muted-foreground">Clients who haven't booked yet</div>
                                  </div>
                                </SelectItem>
                                <SelectItem value="after_2_visits">
                                  <div>
                                    <div className="font-medium">Loyal Clients</div>
                                    <div className="text-sm text-muted-foreground">Clients with 2+ completed appointments</div>
                                  </div>
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              AI-ready targeting rules for automated coupon delivery
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Message Template Selector */}
                    <Card className="border-2 border-dashed border-muted">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MessageSquare className="h-5 w-5" />
                          Message Template
                        </CardTitle>
                        <CardDescription>
                          Choose a pre-written message template and customize it
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="messageTemplate"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Template</FormLabel>
                              <Select onValueChange={(value) => handleTemplateChange(value as MessageTemplateKey)} value={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-message-template">
                                    <SelectValue placeholder="Choose a message template" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {Object.entries(MESSAGE_TEMPLATE_LABELS).map(([key, label]) => (
                                    <SelectItem key={key} value={key}>
                                      {label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Message Preview/Editor */}
                        <FormField
                          control={form.control}
                          name="message"
                          render={({ field }) => (
                            <FormItem>
                              <div className="flex items-center justify-between">
                                <FormLabel>Message Preview & Editor</FormLabel>
                                <div className="text-sm text-muted-foreground">
                                  {watchMessage ? watchMessage.length : 0}/1600 characters
                                </div>
                              </div>
                              <FormControl>
                                <Textarea
                                  placeholder="Your message will appear here when you select a template..."
                                  value={field.value}
                                  onChange={field.onChange}
                                  rows={6}
                                  className="resize-none"
                                  data-testid="textarea-message"
                                />
                              </FormControl>
                              <FormDescription>
                                Customize the message as needed. Perfect for SMS delivery (max 1600 chars).
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>

                {/* Send Button */}
                <div className="flex items-center justify-end space-x-4 pt-6">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => navigate("/")}
                    data-testid="button-cancel"
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={sendCouponMutation.isPending || getRecipientCount() === 0}
                    data-testid="button-send-coupon"
                  >
                    {sendCouponMutation.isPending ? (
                      <>
                        <Send className="mr-2 h-4 w-4 animate-pulse" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send Coupon Now
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </div>
  );
}