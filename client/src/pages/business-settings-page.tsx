import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Settings, Copy, Check } from "lucide-react";
import { DEFAULT_SERVICES_BY_TYPE } from "@shared/schema";

// Business Settings Schema
const businessSettingsSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  businessType: z.enum(["Hairstylist", "Barber", "Nail Technician"]),
  businessDescription: z.string().optional(),
  serviceArea: z.string().optional(),
  smsSenderName: z.string().min(1, "SMS sender name is required").max(11, "SMS sender name must be 11 characters or less"),
  defaultAppointmentDuration: z.enum(["30", "45", "60"]),
  preferredSlotFormat: z.enum(["30", "60"]),
  showPublicly: z.boolean(),
});

type BusinessSettingsFormData = z.infer<typeof businessSettingsSchema>;

// Use shared default services
const DEFAULT_SERVICES = DEFAULT_SERVICES_BY_TYPE;

export default function BusinessSettingsPage() {
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [showServiceReplaceDialog, setShowServiceReplaceDialog] = useState(false);
  const [newBusinessType, setNewBusinessType] = useState<string>("");
  const [linkCopied, setLinkCopied] = useState(false);

  // Fetch user data to populate form
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["/api/user"],
  });

  const form = useForm<BusinessSettingsFormData>({
    resolver: zodResolver(businessSettingsSchema),
    defaultValues: {
      businessName: "",
      businessType: "Hairstylist",
      businessDescription: "",
      serviceArea: "",
      smsSenderName: "",
      defaultAppointmentDuration: "30",
      preferredSlotFormat: "30",
      showPublicly: true,
    },
  });

  // Update form when user data loads
  useEffect(() => {
    if (user) {
      form.reset({
        businessName: (user as any).businessName || "",
        businessType: (user as any).businessType || "Hairstylist",
        businessDescription: (user as any).bio || "",
        serviceArea: (user as any).location || "",
        smsSenderName: (user as any).smsSenderName || "",
        defaultAppointmentDuration: (user as any).defaultAppointmentDuration?.toString() || "30",
        preferredSlotFormat: (user as any).preferredSlotFormat?.toString() || "30",
        showPublicly: (user as any).showPublicly ?? true,
      });
    }
  }, [user]);

  // Update business settings mutation
  const updateBusinessMutation = useMutation({
    mutationFn: async (data: BusinessSettingsFormData) => {
      const response = await apiRequest("PUT", "/api/business-settings", {
        businessName: data.businessName,
        businessType: data.businessType,
        bio: data.businessDescription,
        location: data.serviceArea,
        smsSenderName: data.smsSenderName,
        defaultAppointmentDuration: parseInt(data.defaultAppointmentDuration),
        preferredSlotFormat: parseInt(data.preferredSlotFormat),
        showPublicly: data.showPublicly,
      });
      return response.json();
    },
    onSuccess: () => {
      // Invalidate all user-related queries
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      
      // Invalidate public stylist queries that power the app preview
      const userId = (user as any)?.id;
      const appSlug = (user as any)?.appSlug;
      
      if (userId) {
        queryClient.invalidateQueries({ queryKey: [`/api/public/stylist/${userId}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/public/stylist`, userId] });
      }
      if (appSlug) {
        queryClient.invalidateQueries({ queryKey: [`/api/public/stylist/slug/${appSlug}`] });
        queryClient.invalidateQueries({ queryKey: [`/api/public/stylist/slug`, appSlug] });
      }
      
      // Invalidate any queries that might cache bio information
      queryClient.invalidateQueries({ predicate: (query) => {
        return query.queryKey.some(key => 
          typeof key === 'string' && (
            key.includes('stylist') || 
            key.includes('profile') || 
            key.includes('user')
          )
        );
      }});
      
      toast({
        title: "Settings updated",
        description: "Your business settings have been saved successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Replace services mutation
  const replaceServicesMutation = useMutation({
    mutationFn: async (businessType: string) => {
      const defaultServices = DEFAULT_SERVICES[businessType as keyof typeof DEFAULT_SERVICES];
      const response = await apiRequest("POST", "/api/services/replace", {
        services: defaultServices
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Services updated",
        description: "Your services have been replaced with the default ones for your business type.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Service update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleBusinessTypeChange = (value: string) => {
    const currentBusinessType = form.getValues("businessType");
    if (value !== currentBusinessType) {
      setNewBusinessType(value);
      setShowServiceReplaceDialog(true);
    } else {
      form.setValue("businessType", value as any);
    }
  };

  const handleConfirmServiceReplace = async () => {
    form.setValue("businessType", newBusinessType as any);
    setShowServiceReplaceDialog(false);
    await replaceServicesMutation.mutateAsync(newBusinessType);
  };

  const handleCancelServiceReplace = () => {
    setShowServiceReplaceDialog(false);
    setNewBusinessType("");
  };

  const onSubmit = (data: BusinessSettingsFormData) => {
    updateBusinessMutation.mutate(data);
  };

  const copyBookingLink = () => {
    const bookingLink = (user as any)?.bookingLink || `${window.location.origin}/book/${(user as any)?.id}`;
    navigator.clipboard.writeText(bookingLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
    toast({
      title: "Link copied!",
      description: "Booking link has been copied to clipboard",
    });
  };

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading business settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setLocation("/dashboard")}
              data-testid="button-back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Business Settings</h1>
              <p className="text-muted-foreground">
                Manage your business information and preferences
              </p>
            </div>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Business Information
                </CardTitle>
                <CardDescription>
                  Basic information about your business
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="businessName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your business name"
                          {...field}
                          data-testid="input-business-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Type</FormLabel>
                      <Select
                        onValueChange={handleBusinessTypeChange}
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-business-type">
                            <SelectValue placeholder="Select business type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Hairstylist">Hairstylist</SelectItem>
                          <SelectItem value="Barber">Barber</SelectItem>
                          <SelectItem value="Nail Technician">Nail Technician</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="businessDescription"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Business Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell clients about your business..."
                          {...field}
                          data-testid="textarea-business-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="serviceArea"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Area</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., Downtown Atlanta, GA"
                          {...field}
                          data-testid="input-service-area"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* SMS & Communication Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Communication Settings</CardTitle>
                <CardDescription>
                  Configure how you communicate with clients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="smsSenderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMS Sender Name</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., SalonName"
                          maxLength={11}
                          {...field}
                          data-testid="input-sms-sender-name"
                        />
                      </FormControl>
                      <p className="text-sm text-muted-foreground">
                        Maximum 11 characters. This name will appear when you send SMS to clients.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Booking Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Booking Settings</CardTitle>
                <CardDescription>
                  Configure appointment durations and time slots
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="defaultAppointmentDuration"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Default Appointment Duration</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-appointment-duration">
                            <SelectValue placeholder="Select duration" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 minutes</SelectItem>
                          <SelectItem value="45">45 minutes</SelectItem>
                          <SelectItem value="60">60 minutes</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="preferredSlotFormat"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Slot Format</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-slot-format">
                            <SelectValue placeholder="Select slot format" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="30">30 minute slots</SelectItem>
                          <SelectItem value="60">60 minute slots</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Public Booking */}
            <Card>
              <CardHeader>
                <CardTitle>Public Booking</CardTitle>
                <CardDescription>
                  Manage your public booking page and QR code
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="showPublicly"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Show Publicly</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Allow clients to find and book appointments through your public booking page
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          data-testid="switch-show-publicly"
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* QR Booking Link */}
                <div className="space-y-2">
                  <FormLabel>QR Booking Link</FormLabel>
                  <div className="flex gap-2">
                    <Input
                      value={(user as any)?.bookingLink || `${window.location.origin}/book/${(user as any)?.id}`}
                      readOnly
                      className="bg-muted"
                      data-testid="input-qr-booking-link"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={copyBookingLink}
                      data-testid="button-copy-link"
                    >
                      {linkCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Share this link or generate a QR code for clients to book appointments
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={updateBusinessMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateBusinessMutation.isPending ? "Saving..." : "Save Settings"}
              </Button>
            </div>
          </form>
        </Form>

        {/* Service Replacement Dialog */}
        <AlertDialog open={showServiceReplaceDialog} onOpenChange={setShowServiceReplaceDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Replace Services?</AlertDialogTitle>
              <AlertDialogDescription>
                Do you want to replace your current services with the default services for{" "}
                <span className="font-medium">{newBusinessType}</span>?
                {newBusinessType && DEFAULT_SERVICES[newBusinessType as keyof typeof DEFAULT_SERVICES] && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Default services:</p>
                    <ul className="list-disc list-inside text-sm">
                      {DEFAULT_SERVICES[newBusinessType as keyof typeof DEFAULT_SERVICES].map((service) => (
                        <li key={service}>{service}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={handleCancelServiceReplace}>
                Keep Current Services
              </AlertDialogCancel>
              <AlertDialogAction onClick={handleConfirmServiceReplace}>
                Replace Services
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}