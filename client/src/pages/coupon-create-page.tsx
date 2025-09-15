import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { couponFormSchema, calculateCouponEndDate, type StylistService } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Plus, Percent, DollarSign } from "lucide-react";
import { z } from "zod";

type CouponFormData = z.infer<typeof couponFormSchema>;

export default function CouponCreatePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch available services for targeting
  const { data: services, isLoading: servicesLoading } = useQuery<StylistService[]>({
    queryKey: ["/api/services"],
  });

  const form = useForm<CouponFormData>({
    resolver: zodResolver(couponFormSchema),
    defaultValues: {
      name: "",
      type: "percent",
      amount: "",
      duration: "1month",
      startDate: new Date().toISOString().split('T')[0], // Today's date in YYYY-MM-DD
    },
  });

  const createCouponMutation = useMutation({
    mutationFn: async (data: CouponFormData) => {
      // Calculate end date based on duration
      const endDate = calculateCouponEndDate(data.startDate, data.duration);
      
      // Prepare coupon data for API
      const couponData = {
        name: data.name,
        type: data.type,
        amount: data.amount,
        serviceId: data.serviceId || null,
        startDate: data.startDate,
        endDate: endDate,
      };

      const response = await apiRequest("POST", "/api/coupons", couponData);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({
        title: "Coupon created successfully!",
        description: "Your new coupon is ready to be sent to clients.",
      });
      navigate("/"); // Navigate back to dashboard
    },
    onError: (error: Error) => {
      toast({
        title: "Error creating coupon",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CouponFormData) => {
    createCouponMutation.mutate(data);
  };

  const watchType = form.watch("type");
  const watchDuration = form.watch("duration");
  const watchStartDate = form.watch("startDate");

  // Calculate and display end date
  const endDate = watchStartDate && watchDuration 
    ? calculateCouponEndDate(watchStartDate, watchDuration)
    : "";

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
                <h1 className="text-xl font-semibold">Create New Coupon</h1>
                <p className="text-sm text-muted-foreground">Set up a promotional offer for your clients</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Basic Coupon Information */}
            <Card>
              <CardHeader>
                <CardTitle>Coupon Details</CardTitle>
                <CardDescription>
                  Set up the basic information for your coupon
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coupon Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Spring Special, New Client Discount" 
                          {...field} 
                          data-testid="input-coupon-name"
                        />
                      </FormControl>
                      <FormDescription>
                        A friendly name for your coupon (shown to clients)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Discount Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-coupon-type">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="percent">
                              <div className="flex items-center space-x-2">
                                <Percent className="h-4 w-4" />
                                <span>Percentage Off</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="flat">
                              <div className="flex items-center space-x-2">
                                <DollarSign className="h-4 w-4" />
                                <span>Dollar Amount Off</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          {watchType === "percent" ? "Percentage (1-100)" : "Dollar Amount"} *
                        </FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type="number"
                              step={watchType === "percent" ? "1" : "0.01"}
                              min={watchType === "percent" ? "1" : "0.01"}
                              max={watchType === "percent" ? "100" : "9999.99"}
                              placeholder={watchType === "percent" ? "15" : "25.00"}
                              {...field}
                              data-testid="input-coupon-amount"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                              {watchType === "percent" ? (
                                <Percent className="h-4 w-4 text-muted-foreground" />
                              ) : (
                                <DollarSign className="h-4 w-4 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </FormControl>
                        <FormDescription>
                          {watchType === "percent" 
                            ? "Enter a percentage between 1 and 100"
                            : "Enter dollar amount (e.g., 25.00)"
                          }
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Service Targeting */}
            <Card>
              <CardHeader>
                <CardTitle>Service Targeting</CardTitle>
                <CardDescription>
                  Choose which services this coupon applies to
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Target Service (Optional)</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(value ? parseInt(value) : undefined)} 
                        value={field.value?.toString() || ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-service">
                            <SelectValue placeholder="All services (general coupon)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="">All services (general coupon)</SelectItem>
                          {servicesLoading ? (
                            <SelectItem value="" disabled>Loading services...</SelectItem>
                          ) : (
                            services?.map((service) => (
                              <SelectItem key={service.id} value={service.id.toString()}>
                                {service.serviceName} (${service.price})
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Leave blank for general coupons that apply to any service
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Duration and Dates */}
            <Card>
              <CardHeader>
                <CardTitle>Validity Period</CardTitle>
                <CardDescription>
                  Set when this coupon will be active
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Start Date *</FormLabel>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            data-testid="input-start-date"
                          />
                        </FormControl>
                        <FormDescription>
                          When the coupon becomes valid
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="duration"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-duration">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="2weeks">2 Weeks</SelectItem>
                            <SelectItem value="1month">1 Month</SelectItem>
                            <SelectItem value="3months">3 Months</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          How long the coupon remains valid
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* End Date Display */}
                {endDate && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Coupon will expire on:</span>
                      <span className="text-lg font-semibold" data-testid="text-coupon-end-date">{endDate}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Submit Button */}
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
                disabled={createCouponMutation.isPending}
                data-testid="button-create-coupon"
              >
                {createCouponMutation.isPending ? (
                  <>
                    <Plus className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Coupon
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}