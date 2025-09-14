import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { updateProfileSchema, type UpdateProfile } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Check } from "lucide-react";

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

  const form = useForm<UpdateProfile>({
    resolver: zodResolver(updateProfileSchema),
    defaultValues: {
      phone: "",
      location: "",
      servicesOffered: [],
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

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const response = await apiRequest("/api/profile", "PATCH", data);
      if (!response.ok) {
        throw new Error(await response.text());
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Profile completed successfully!",
        description: "Your business profile is now complete.",
      });
      navigate("/");
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

  const handleBusinessHourChange = (day: string, field: 'open' | 'close' | 'isClosed', value: string | boolean) => {
    const currentHours = form.getValues('businessHours');
    form.setValue('businessHours', {
      ...currentHours,
      [day]: {
        ...currentHours[day],
        [field]: value,
      },
    });
  };

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
                <h1 className="text-xl font-semibold">Complete Your Profile</h1>
                <p className="text-sm text-muted-foreground">Set up your business details</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
                <CardDescription>
                  Let clients know how to reach you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
            <Card>
              <CardHeader>
                <CardTitle>Services Offered</CardTitle>
                <CardDescription>
                  Select the services you provide (select at least one)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="servicesOffered"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {COMMON_SERVICES.map((service) => (
                            <div key={service} className="flex items-center space-x-2">
                              <Checkbox
                                id={service}
                                checked={field.value?.includes(service) || false}
                                onCheckedChange={(checked) => {
                                  const currentServices = field.value || [];
                                  const newServices = checked
                                    ? [...currentServices, service]
                                    : currentServices.filter(s => s !== service);
                                  field.onChange(newServices);
                                }}
                                data-testid={`checkbox-service-${service.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                              />
                              <label
                                htmlFor={service}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                              >
                                {service}
                              </label>
                            </div>
                          ))}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* About You */}
            <Card>
              <CardHeader>
                <CardTitle>About You</CardTitle>
                <CardDescription>
                  Tell clients about your experience and expertise
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
            <Card>
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
                      
                      <Checkbox
                        checked={!form.watch(`businessHours.${day.key}.isClosed`)}
                        onCheckedChange={(checked) => 
                          handleBusinessHourChange(day.key, 'isClosed', !checked)
                        }
                        data-testid={`checkbox-${day.key}-open`}
                      />
                      <span className="text-sm">Open</span>
                      
                      {!form.watch(`businessHours.${day.key}.isClosed`) && (
                        <>
                          <Input
                            type="time"
                            value={form.watch(`businessHours.${day.key}.open`) || "09:00"}
                            onChange={(e) => handleBusinessHourChange(day.key, 'open', e.target.value)}
                            className="w-32"
                            data-testid={`input-${day.key}-open`}
                          />
                          <span className="text-sm">to</span>
                          <Input
                            type="time"
                            value={form.watch(`businessHours.${day.key}.close`) || "17:00"}
                            onChange={(e) => handleBusinessHourChange(day.key, 'close', e.target.value)}
                            className="w-32"
                            data-testid={`input-${day.key}-close`}
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
            <Card>
              <CardHeader>
                <CardTitle>Optional Information</CardTitle>
                <CardDescription>
                  Additional details to help clients find and book with you
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
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
                onClick={() => navigate("/")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending || !form.watch('servicesOffered')?.length}
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