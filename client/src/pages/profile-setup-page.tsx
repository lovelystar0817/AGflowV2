import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { updateProfileSchema, type UpdateProfile, type StylistService, type TimeRange, DEFAULT_SERVICES_BY_TYPE } from "@shared/schema";
import { addDays, format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Check, Plus, X } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";

const DAYS_OF_WEEK = [
  { key: "monday", label: "Monday" },
  { key: "tuesday", label: "Tuesday" },
  { key: "wednesday", label: "Wednesday" },
  { key: "thursday", label: "Thursday" },
  { key: "friday", label: "Friday" },
  { key: "saturday", label: "Saturday" },
  { key: "sunday", label: "Sunday" },
];

const COMMON_SERVICES = [
  "Haircut & Styling",
  "Hair Coloring",
  "Highlights & Lowlights", 
  "Balayage",
  "Hair Extensions",
  "Blowout & Styling",
  "Special Occasion Hair",
  "Bridal Hair",
  "Keratin Treatment",
  "Hair Washing & Conditioning",
  "Beard Trimming",
  "Eyebrow Shaping",
];

const EXPERIENCE_OPTIONS = Array.from({ length: 51 }, (_, i) => ({
  value: i,
  label: i === 0 ? "New to the industry" : i === 1 ? "1 year" : `${i} years`
}));

export default function ProfileSetupPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  

  // State for custom service creation
  const [customServiceName, setCustomServiceName] = useState("");
  const [customServicePrice, setCustomServicePrice] = useState("");
  
  // State for services tabs
  const [activeServicesTab, setActiveServicesTab] = useState("hairstylist");

  // Fetch existing services
  const { data: servicesResponse, isLoading: servicesLoading } = useQuery<{ items: StylistService[] }>({
    queryKey: ["/api/services"],
    enabled: !!user, // Only fetch if user is authenticated
  });

  // Extract services array from paginated response
  const existingServices = servicesResponse?.items || [];

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phone: "",
      location: "",
      services: [],
      bio: "",
      businessHours: {
        monday: { open: "09:00", close: "17:00", isClosed: false },
        tuesday: { open: "09:00", close: "17:00", isClosed: false },
        wednesday: { open: "09:00", close: "17:00", isClosed: false },
        thursday: { open: "09:00", close: "17:00", isClosed: false },
        friday: { open: "09:00", close: "17:00", isClosed: false },
        saturday: { open: "09:00", close: "17:00", isClosed: false },
        sunday: { open: "09:00", close: "17:00", isClosed: true },
      },
      yearsOfExperience: 0,
      instagramHandle: "",
      bookingLink: "",
    },
  });

  // Populate form with existing user data and services when loaded
  useEffect(() => {
    if (user && !servicesLoading) {
      // Convert existing services from DB format (string prices) to form format (number prices)
      const formServices = existingServices ? existingServices.map(service => ({
        serviceName: service.serviceName,
        price: parseFloat(service.price),
        isCustom: service.isCustom
      })) : [];

      // Reset form with existing user data
      form.reset({
        phone: user.phone || "",
        location: user.location || "",
        services: formServices,
        bio: user.bio || "",
        businessHours: user.businessHours || {
          monday: { open: "09:00", close: "17:00", isClosed: false },
          tuesday: { open: "09:00", close: "17:00", isClosed: false },
          wednesday: { open: "09:00", close: "17:00", isClosed: false },
          thursday: { open: "09:00", close: "17:00", isClosed: false },
          friday: { open: "09:00", close: "17:00", isClosed: false },
          saturday: { open: "09:00", close: "17:00", isClosed: false },
          sunday: { open: "09:00", close: "17:00", isClosed: true },
        },
        yearsOfExperience: user.yearsOfExperience || 0,
        instagramHandle: user.instagramHandle || "",
        bookingLink: user.bookingLink || "",
      });
    }
  }, [user, existingServices, servicesLoading, form]);

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "services",
  });

  // Helper function to create default availability for new users only
  const createDefaultAvailabilityForNewUser = (businessHours: UpdateProfile['businessHours'], isFirstTimeSetup: boolean) => {
    if (!businessHours || !isFirstTimeSetup) return;
    
    // Fire and forget - don't block navigation
    setTimeout(async () => {
      try {
        const startDate = new Date(); // Start from today
        const promises = [];
        let successCount = 0;
        
        for (let dayOffset = 0; dayOffset < 28; dayOffset++) { // Next 28 days
          const currentDate = addDays(startDate, dayOffset);
          const dateStr = format(currentDate, 'yyyy-MM-dd');
          
          // Get the day name
          const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
          const dayName = dayNames[currentDate.getDay()] as keyof typeof businessHours;
          const dayHours = businessHours[dayName];
          
          if (dayHours && !dayHours.isClosed) {
            // Check if availability already exists to avoid overwriting
            const checkPromise = apiRequest('GET', `/api/availability/${dateStr}`, undefined)
              .then(response => response.json())
              .then(existingData => {
                // Only create if no time ranges exist (default empty state)
                if (!existingData.timeRanges || existingData.timeRanges.length === 0) {
                  const timeRanges: TimeRange[] = [{
                    start: dayHours.open,
                    end: dayHours.close,
                  }];
                  
                  const availabilityData = {
                    isOpen: true,
                    timeRanges,
                  };
                  
                  return apiRequest('PUT', `/api/availability/${dateStr}`, availabilityData)
                    .then(() => { successCount++; })
                    .catch(error => console.warn(`Failed to create availability for ${dateStr}:`, error));
                }
              })
              .catch(error => console.warn(`Failed to check availability for ${dateStr}:`, error));
            
            promises.push(checkPromise);
          }
        }
        
        await Promise.allSettled(promises);
        
        // Invalidate availability queries to refresh calendar
        queryClient.invalidateQueries({ queryKey: ['/api/availability'] });
        
        // Show result toast
        if (successCount > 0) {
          toast({
            title: "Default availability set up",
            description: `Created availability for ${successCount} days based on your business hours.`,
          });
        }
      } catch (error) {
        console.error('Error setting up default availability:', error);
      }
    }, 100); // Small delay to ensure navigation completes first
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest("PATCH", "/api/profile", data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return { profileData: await response.json(), businessHours: data.businessHours };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      
      // Check if this is first-time profile completion (user had no previous business hours)
      const isFirstTimeSetup = !user?.businessHours;
      
      // Set up default availability for new users only (non-blocking)
      createDefaultAvailabilityForNewUser(result.businessHours, isFirstTimeSetup);
      
      toast({
        title: "Profile completed successfully!",
        description: isFirstTimeSetup 
          ? "Your business profile is complete. Setting up default availability based on your business hours..."
          : "Your business profile has been updated successfully.",
      });
      
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({
        title: "Error updating profile",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: UpdateProfile) => {
    updateProfileMutation.mutate(data);
  };


  const handlePresetServiceToggle = (serviceName: string, checked: boolean) => {
    const currentServices = form.getValues('services') || [];
    
    if (checked) {
      // Add service with default price
      append({
        serviceName,
        price: 50, // Default price
        isCustom: false,
      });
    } else {
      // Remove service
      const index = currentServices.findIndex(s => s.serviceName === serviceName && !s.isCustom);
      if (index !== -1) {
        remove(index);
      }
    }
  };

  const addCustomService = () => {
    if (!customServiceName.trim() || !customServicePrice) return;

    const price = parseFloat(customServicePrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid price greater than 0",
        variant: "destructive",
      });
      return;
    }

    append({
      serviceName: customServiceName.trim(),
      price,
      isCustom: true,
    });

    setCustomServiceName("");
    setCustomServicePrice("");
  };

  const currentServices = form.watch('services') || [];
  const isPresetServiceSelected = (serviceName: string) => {
    return currentServices.some(s => s.serviceName === serviceName && !s.isCustom);
  };

  const getPresetServicePrice = (serviceName: string) => {
    const service = currentServices.find(s => s.serviceName === serviceName && !s.isCustom);
    return service ? service.price.toString() : "";
  };

  const updatePresetServicePrice = (serviceName: string, price: string) => {
    const currentServices = form.getValues('services') || [];
    const index = currentServices.findIndex(s => s.serviceName === serviceName && !s.isCustom);
    
    if (index !== -1) {
      const numPrice = parseFloat(price) || 0;
      form.setValue(`services.${index}.price`, numPrice);
    }
  };

  return (
    <div className="min-h-screen bg-background animate-fade-in">
      {/* Header */}
      <div className="bg-card border-b border-border shadow-sm transition-enhanced">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            <div className="flex items-center space-x-2 sm:space-x-4 min-w-0 flex-1">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => navigate("/dashboard")}
                className="h-8 w-8 sm:h-10 sm:w-10 transition-enhanced hover-lift flex-shrink-0"
                data-testid="button-back"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <h1 className="text-lg sm:text-xl font-semibold truncate">Complete Your Profile</h1>
                <p className="text-xs sm:text-sm text-muted-foreground truncate">Set up your business details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 lg:space-y-8 animate-slide-in">
            {/* Contact Information */}
            <Card className="shadow-enhanced glass transition-enhanced hover-lift">
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Let clients know how to reach you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="(555) 123-4567" 
                          {...field} 
                          data-testid="input-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="City, State or ZIP code" 
                          {...field} 
                          data-testid="input-location"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Services Offered */}
            <Card className="shadow-enhanced glass transition-enhanced hover-lift">
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
                <CardDescription>
                  Select services you provide and set your prices (at least one service required)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                {/* Preset Services with Tabs */}
                <div>
                  <h4 className="text-sm font-medium mb-4">Services by Category</h4>
                  <Tabs value={activeServicesTab} onValueChange={setActiveServicesTab}>
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="hairstylist">Hairstylist</TabsTrigger>
                      <TabsTrigger value="barber">Barber</TabsTrigger>
                      <TabsTrigger value="nail-tech">Nail Tech</TabsTrigger>
                      <TabsTrigger value="other">Other</TabsTrigger>
                    </TabsList>
                    
                    {/* Hairstylist Services Tab */}
                    <TabsContent value="hairstylist" className="mt-4">
                      <div className="space-y-4">
                        {[...COMMON_SERVICES, ...DEFAULT_SERVICES_BY_TYPE.Hairstylist].map((service) => (
                          <div key={service} className="flex items-center space-x-4">
                            <Checkbox
                              id={service}
                              checked={isPresetServiceSelected(service)}
                              onCheckedChange={(checked) => handlePresetServiceToggle(service, !!checked)}
                              data-testid={`checkbox-service-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            />
                            <label
                              htmlFor={service}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {service}
                            </label>
                            {isPresetServiceSelected(service) && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={getPresetServicePrice(service)}
                                  onChange={(e) => updatePresetServicePrice(service, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-price-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    {/* Barber Services Tab */}
                    <TabsContent value="barber" className="mt-4">
                      <div className="space-y-4">
                        {DEFAULT_SERVICES_BY_TYPE.Barber.map((service) => (
                          <div key={service} className="flex items-center space-x-4">
                            <Checkbox
                              id={`barber-${service}`}
                              checked={isPresetServiceSelected(service)}
                              onCheckedChange={(checked) => handlePresetServiceToggle(service, !!checked)}
                              data-testid={`checkbox-service-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            />
                            <label
                              htmlFor={`barber-${service}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {service}
                            </label>
                            {isPresetServiceSelected(service) && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={getPresetServicePrice(service)}
                                  onChange={(e) => updatePresetServicePrice(service, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-price-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    {/* Nail Technician Services Tab */}
                    <TabsContent value="nail-tech" className="mt-4">
                      <div className="space-y-4">
                        {DEFAULT_SERVICES_BY_TYPE["Nail Technician"].map((service) => (
                          <div key={service} className="flex items-center space-x-4">
                            <Checkbox
                              id={`nail-tech-${service}`}
                              checked={isPresetServiceSelected(service)}
                              onCheckedChange={(checked) => handlePresetServiceToggle(service, !!checked)}
                              data-testid={`checkbox-service-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            />
                            <label
                              htmlFor={`nail-tech-${service}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {service}
                            </label>
                            {isPresetServiceSelected(service) && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={getPresetServicePrice(service)}
                                  onChange={(e) => updatePresetServicePrice(service, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-price-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                    
                    {/* Other Services Tab */}
                    <TabsContent value="other" className="mt-4">
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground mb-4">
                          General services that apply across different business types
                        </p>
                        {["Consultation", "Touch-up", "Package Deal", "Group Service"].map((service) => (
                          <div key={service} className="flex items-center space-x-4">
                            <Checkbox
                              id={`other-${service}`}
                              checked={isPresetServiceSelected(service)}
                              onCheckedChange={(checked) => handlePresetServiceToggle(service, !!checked)}
                              data-testid={`checkbox-service-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                            />
                            <label
                              htmlFor={`other-${service}`}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1"
                            >
                              {service}
                            </label>
                            {isPresetServiceSelected(service) && (
                              <div className="flex items-center space-x-2">
                                <span className="text-sm">$</span>
                                <Input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="0.00"
                                  value={getPresetServicePrice(service)}
                                  onChange={(e) => updatePresetServicePrice(service, e.target.value)}
                                  className="w-24"
                                  data-testid={`input-price-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Custom Service Creator */}
                <div className="border-t pt-6">
                  <h4 className="text-sm font-medium mb-4">Add Custom Service</h4>
                  <div className="flex items-end space-x-4">
                    <div className="flex-1">
                      <label className="text-sm font-medium">Service Name</label>
                      <Input
                        placeholder="e.g., Custom Color Treatment"
                        value={customServiceName}
                        onChange={(e) => setCustomServiceName(e.target.value)}
                        data-testid="input-custom-service-name"
                      />
                    </div>
                    <div className="w-32">
                      <label className="text-sm font-medium">Price ($)</label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        value={customServicePrice}
                        onChange={(e) => setCustomServicePrice(e.target.value)}
                        data-testid="input-custom-service-price"
                      />
                    </div>
                    <Button
                      type="button"
                      onClick={addCustomService}
                      disabled={!customServiceName.trim() || !customServicePrice}
                      data-testid="button-add-custom-service"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Service
                    </Button>
                  </div>
                </div>

                {/* Added Services List */}
                {currentServices.length > 0 && (
                  <div className="border-t pt-6">
                    <h4 className="text-sm font-medium mb-4">Your Services ({currentServices.length})</h4>
                    <div className="space-y-2">
                      {currentServices.map((service, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div className="flex items-center space-x-3">
                            <span className="font-medium">{service.serviceName}</span>
                            <span className="text-sm text-muted-foreground">
                              ${service.price.toFixed(2)}
                            </span>
                            {service.isCustom && (
                              <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded">
                                Custom
                              </span>
                            )}
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => remove(index)}
                            data-testid={`button-remove-service-${index}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <FormField
                  control={form.control}
                  name="services"
                  render={() => (
                    <FormItem>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* About You */}
            <Card className="shadow-enhanced glass transition-enhanced hover-lift">
              <CardHeader>
                <CardTitle>About You</CardTitle>
                <CardDescription>
                  Tell clients about your experience and expertise
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="bio"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bio/About You *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Tell clients about your experience, specialties, and what makes you unique..."
                          className="min-h-[120px] resize-none"
                          {...field}
                          data-testid="textarea-bio"
                        />
                      </FormControl>
                      <FormDescription>
                        Minimum 10 characters. This will be shown to potential clients.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="yearsOfExperience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Years of Experience</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-experience">
                            <SelectValue placeholder="Select your experience level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EXPERIENCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value.toString()}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className="shadow-enhanced glass transition-enhanced hover-lift">
              <CardHeader>
                <CardTitle>Business Hours</CardTitle>
                <CardDescription>
                  Set your availability for each day of the week
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {DAYS_OF_WEEK.map((day) => (
                    <div key={day.key} className="flex items-center space-x-4">
                      <div className="w-24">
                        <label className="text-sm font-medium">{day.label}</label>
                      </div>
                      
                      <FormField
                        control={form.control}
                        name={`businessHours.${day.key}.isClosed`}
                        render={({ field }) => (
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              checked={!field.value}
                              onCheckedChange={(checked) => field.onChange(!checked)}
                              data-testid={`checkbox-${day.key}-open`}
                            />
                            <span className="text-sm">Open</span>
                          </div>
                        )}
                      />
                      
                      {!form.watch(`businessHours.${day.key}.isClosed`) && (
                        <>
                          <FormField
                            control={form.control}
                            name={`businessHours.${day.key}.open`}
                            render={({ field }) => (
                              <Input
                                type="time"
                                {...field}
                                className="w-32"
                                data-testid={`input-${day.key}-open`}
                              />
                            )}
                          />
                          <span className="text-sm">to</span>
                          <FormField
                            control={form.control}
                            name={`businessHours.${day.key}.close`}
                            render={({ field }) => (
                              <Input
                                type="time"
                                {...field}
                                className="w-32"
                                data-testid={`input-${day.key}-close`}
                              />
                            )}
                          />
                        </>
                      )}
                      
                      {form.watch(`businessHours.${day.key}.isClosed`) && (
                        <span className="text-sm text-muted-foreground">Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Optional Information */}
            <Card className="shadow-enhanced glass transition-enhanced hover-lift">
              <CardHeader>
                <CardTitle>Optional Information</CardTitle>
                <CardDescription>
                  Additional details to help clients find and book with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
                <FormField
                  control={form.control}
                  name="instagramHandle"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instagram Handle</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="@yourusername" 
                          {...field} 
                          data-testid="input-instagram"
                        />
                      </FormControl>
                      <FormDescription>
                        Share your Instagram to showcase your work
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bookingLink"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Booking Link</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="https://calendly.com/yourbooking" 
                          {...field} 
                          data-testid="input-booking-link"
                        />
                      </FormControl>
                      <FormDescription>
                        Direct link where clients can book appointments
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate("/dashboard")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || currentServices.length === 0}
                data-testid="button-complete-profile"
              >
                {updateProfileMutation.isPending ? (
                  "Saving..."
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Complete Profile
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