import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { useState, useEffect } from "react";
import { 
  insertAppointmentSchema,
  insertClientSchema,
  type Stylist,
  type StylistService,
  type Client,
  filterAvailableSlots,
  generate30MinuteSlots,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarDays, Clock, User, Phone, Scissors, CheckCircle, MapPin, Instagram } from "lucide-react";
import { z } from "zod";
import { getAppTheme } from "@/lib/appThemes";
import { PortfolioGallery } from "@/components/PortfolioGallery";
import { cn } from "@/lib/utils";

// Combined schema for booking form
const bookingFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  serviceId: z.number().min(1, "Please select a service"),
  date: z.date({ required_error: "Please select a date" }),
  startTime: z.string().min(1, "Please select a time"),
  optInMarketing: z.boolean().default(false),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function PublicBookingPage() {
  const { stylistId } = useParams();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isSubmitted, setIsSubmitted] = useState(false);
  const handleBookNow = () => {
    const el = document.getElementById("booking-form");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Fetch stylist details
  const { data: stylist, isLoading: stylistLoading } = useQuery<
    Stylist & {
      city?: string;
      state?: string;
      themeId?: number;
      portfolioPhotos?: string[];
      bio?: string;
      businessName?: string;
      instagramHandle?: string;
    }
  >({
    queryKey: ["/api/public/stylist", stylistId],
    queryFn: async () => {
      const response = await fetch(`/api/public/stylist/${stylistId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Stylist not found");
        }
        throw new Error("Failed to load stylist information");
      }
      return response.json();
    },
    enabled: !!stylistId,
  });

  // Fetch stylist services
  const { data: services, isLoading: servicesLoading } = useQuery<StylistService[]>({
    queryKey: ["/api/public/services", stylistId],
    queryFn: async () => {
      const response = await fetch(`/api/public/services/${stylistId}`);
      if (!response.ok) throw new Error("Failed to load services");
      return response.json();
    },
    enabled: !!stylistId,
  });

  // Fetch availability for selected date
  const { data: availability, isLoading: availabilityLoading } = useQuery({
    queryKey: ["/api/public/availability", stylistId, selectedDate ? (() => {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    })() : null],
    queryFn: async () => {
      if (!selectedDate) return null;
      // Use local date formatting to avoid timezone issues
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      const response = await fetch(`/api/public/availability/${stylistId}/${dateStr}`);
      if (!response.ok) throw new Error("Failed to load availability");
      return response.json();
    },
    enabled: !!stylistId && !!selectedDate,
  });

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phone: "",
      email: "",
      serviceId: 0,
      startTime: "",
      optInMarketing: false,
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async (data: BookingFormData) => {
      const response = await apiRequest("POST", `/api/public/book/${stylistId}`, {
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        serviceId: data.serviceId,
        date: (() => {
          // Use local date formatting to avoid timezone issues
          const year = data.date.getFullYear();
          const month = String(data.date.getMonth() + 1).padStart(2, '0');
          const day = String(data.date.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        })(),
        startTime: data.startTime,
        optInMarketing: data.optInMarketing,
      });
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Booking confirmed!",
        description: "Your appointment has been successfully booked.",
      });
    },
    onError: (error: Error) => {
      // Parse error message for better user feedback
      let title = "Booking failed";
      let description = error.message;
      
      if (error.message.includes("time slot is already booked")) {
        title = "Time slot unavailable";
        description = "This time slot has just been booked by someone else. Please choose a different time.";
      } else if (error.message.includes("stylist not found")) {
        title = "Stylist unavailable";
        description = "This stylist is no longer accepting bookings. Please try again later.";
      } else if (error.message.includes("invalid service")) {
        title = "Service unavailable";
        description = "This service is no longer offered. Please select a different service.";
      } else if (error.message.includes("missing required fields")) {
        title = "Information required";
        description = "Please fill in all required fields to complete your booking.";
      } else if (error.message.includes("invalid email")) {
        title = "Invalid email";
        description = "Please enter a valid email address to receive your booking confirmation.";
      } else if (error.message.toLowerCase().includes("network") || error.message.toLowerCase().includes("fetch")) {
        title = "Connection problem";
        description = "Unable to connect to booking system. Please check your internet connection and try again.";
      }
      
      toast({
        title,
        description,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: BookingFormData) => {
    bookingMutation.mutate(data);
  };

  const watchServiceId = form.watch("serviceId");

  // Get available time slots
  const getAvailableSlots = () => {
    if (!availability || !availability.isOpen) return [];
    
    const allSlots = generate30MinuteSlots(availability.timeRanges || []);
    const bookedSlots = availability.bookedSlots || [];
    
    let availableSlots = filterAvailableSlots(allSlots, bookedSlots);
    
    // Only filter past times if date is today (use local time)
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    const selectedDateCopy = selectedDate ? new Date(selectedDate) : null;
    if (selectedDateCopy) {
      selectedDateCopy.setHours(0, 0, 0, 0); // Reset to start of day for comparison
    }
    
    if (selectedDate && selectedDateCopy && selectedDateCopy.getTime() === today.getTime()) {
      const now = new Date();
      availableSlots = availableSlots.filter(slot => {
        const [hours, minutes] = slot.split(':').map(Number);
        const slotDateTime = new Date();
        slotDateTime.setHours(hours, minutes, 0, 0);
        return slotDateTime > now;
      });
    }
    
    return availableSlots;
  };

  // Convert 24-hour format to 12-hour format for display consistency
  const convertTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  const selectedService = services?.find(s => s.id === watchServiceId);

  // Loading state
  if (stylistLoading) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 dark:border-white mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading booking page...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!stylist) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Stylist Not Found</CardTitle>
            <CardDescription className="text-center">
              The booking page you're looking for doesn't exist.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Success state
  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>
            <CardTitle className="text-center">Booking Confirmed!</CardTitle>
            <CardDescription className="text-center">
              Your appointment with {stylist.firstName} {stylist.lastName} has been successfully booked.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4" />
                <span>Service: {selectedService?.serviceName}</span>
              </div>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                <span>Date: {selectedDate?.toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Time: {convertTo12Hour(form.getValues("startTime"))}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Get theme for consistent styling
  const theme = getAppTheme(stylist.themeId ?? 1);
  const combinedLocation = stylist.city && stylist.state ? `${stylist.city}, ${stylist.state}` : stylist.location;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 animate-fade-in py-8">
      {/* Unified App Card Layout */}
      <div className="max-w-md mx-auto bg-white shadow-xl rounded-xl">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            {/* Header */}
            <div className={cn(theme.header, "p-6 rounded-t-xl")}> 
              <div className="text-center mb-2">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Scissors className={cn("h-6 w-6", theme.accent)} />
                  <h1 className={cn("text-2xl font-bold", theme.text)}>
                    {stylist.businessName || `${stylist.firstName} ${stylist.lastName}`}
                  </h1>
                </div>
                <div className={cn("flex items-center justify-center space-x-4 text-sm opacity-90", theme.subText)}>
                  {combinedLocation && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="h-4 w-4" />
                      <span>{combinedLocation}</span>
                    </div>
                  )}
                  {stylist.instagramHandle && (
                    <div className="flex items-center space-x-1">
                      <Instagram className="h-4 w-4" />
                      <span>@{stylist.instagramHandle}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Portfolio */}
            {Array.isArray(stylist.portfolioPhotos) && stylist.portfolioPhotos.length > 0 && (
              <div className="px-6 pt-4">
                <PortfolioGallery
                  photos={stylist.portfolioPhotos}
                  editable={false}
                  aspectRatio="square"
                  showIndicators={true}
                  className="mb-4"
                />
              </div>
            )}

            <div className="p-6 space-y-6">
              {/* Bio */}
              {stylist.bio && (
                <Card className={cn(theme.card)}>
                  <CardContent className="p-4">
                    <h3 className={cn("font-semibold mb-3", theme.text)}>About</h3>
                    <p className={cn("text-sm leading-relaxed", theme.subText)}>{stylist.bio}</p>
                  </CardContent>
                </Card>
              )}
              {/* Services */}
              <Card className={cn(theme.card)}>
                <CardContent className="p-4">
                  <h3 className={cn("font-semibold mb-4", theme.text)}>Services</h3>
                  <FormField
                    control={form.control}
                    name="serviceId"
                    render={({ field }) => (
                      <FormItem>
                        <div className="space-y-3">
                          {services?.map((service) => (
                            <Button
                              key={service.id}
                              type="button"
                              variant={field.value === service.id ? "default" : "outline"}
                              className={cn(
                                "w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border-2 transition-all",
                                field.value === service.id ? theme.serviceSelected : theme.serviceButton
                              )}
                              onClick={() => field.onChange(service.id)}
                              data-testid={`service-btn-${service.id}`}
                            >
                              <span className="font-medium">{service.serviceName}</span>
                              <div className={cn(
                                "ml-2 px-3 py-1 rounded-full text-sm font-semibold transition-colors",
                                field.value === service.id 
                                  ? "bg-white/20 text-white" 
                                  : "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"
                              )}>
                                ${service.price}
                              </div>
                            </Button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Date & Time Selection */}
              <Card className={cn(theme.card)}>
                <CardContent className="p-4">
                  <h3 className={cn("font-semibold mb-4", theme.text)}>Date & Time</h3>
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setSelectedDate(date);
                            form.setValue("startTime", "");
                          }}
                          disabled={(date) => {
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            return date < today;
                          }}
                          initialFocus
                          className="w-full p-3"
                          classNames={{
                            months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0 w-full",
                            month: "space-y-4 w-full",
                            table: "w-full border-collapse space-y-1",
                            head_row: "flex w-full",
                            head_cell: "text-gray-500 rounded-md w-9 font-medium text-sm text-center",
                            row: "flex w-full mt-2",
                            cell: "h-9 w-9 text-center text-sm p-0 relative flex-1",
                            day: "h-9 w-9 p-0 font-normal text-sm rounded-lg border-0 transition-all hover:scale-105 flex items-center justify-center bg-transparent hover:bg-gray-100 text-gray-900",
                            day_selected: "bg-gray-900 text-white font-semibold shadow-md hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
                            day_today: "bg-gray-100 text-gray-900 font-semibold ring-1 ring-gray-400",
                            day_outside: "text-gray-400 opacity-60",
                            day_disabled: "text-gray-300 cursor-not-allowed opacity-50",
                            nav_button: "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100 rounded-lg hover:bg-gray-100",
                            nav_button_previous: "absolute left-1",
                            nav_button_next: "absolute right-1",
                            caption: "flex justify-center pt-1 relative items-center mb-4",
                            caption_label: "text-sm font-medium"
                          }}
                        />
                        <FormMessage />

                        {/* Time Slots */}
                        {selectedDate && (
                          <div className="mt-4 pt-4 border-t">
                            <div className={cn("text-sm font-medium mb-3", theme.text)}>Available Times</div>
                            <FormField
                              control={form.control}
                              name="startTime"
                              render={({ field: timeField }) => (
                                <FormItem>
                                  {availabilityLoading ? (
                                    <div className="flex items-center justify-center py-6">
                                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                                      <span className={cn("ml-2 text-sm", theme.subText)}>Loading times...</span>
                                    </div>
                                  ) : getAvailableSlots().length === 0 ? (
                                    <div className="text-center py-6">
                                      <Clock className={cn("h-8 w-8 mx-auto mb-2", theme.subText)} />
                                      <p className={cn("text-sm", theme.subText)}>No available times</p>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-3 gap-2">
                                      {getAvailableSlots().map((slot) => (
                                        <Button
                                          key={slot}
                                          type="button"
                                          variant={timeField.value === slot ? "default" : "outline"}
                                          className={cn(
                                            "h-8 text-xs transition-all",
                                            timeField.value === slot ? theme.serviceSelected : theme.serviceButton
                                          )}
                                          onClick={() => timeField.onChange(slot)}
                                          data-testid={`time-slot-${slot.replace(':', '-')}`}
                                        >
                                          {convertTo12Hour(slot)}
                                        </Button>
                                      ))}
                                    </div>
                                  )}
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        )}
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* Personal Information */}
              <Card className={cn(theme.card)}>
                <CardContent className="p-4">
                  <h3 className={cn("font-semibold mb-4", theme.text)}>Your Information</h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="First name" 
                                {...field} 
                                className="h-8 text-sm"
                                data-testid="input-firstName" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs">Last Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="Last name" 
                                {...field} 
                                className="h-8 text-sm"
                                data-testid="input-lastName" 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Phone Number</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your phone number" 
                              {...field} 
                              className="h-8 text-sm"
                              data-testid="input-phone" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs">Email (Optional)</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your email" 
                              {...field} 
                              className="h-8 text-sm"
                              data-testid="input-email" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="optInMarketing"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-start space-x-2 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                              className="mt-1"
                              data-testid="checkbox-opt-in-marketing"
                            />
                          </FormControl>
                          <FormLabel className="text-xs leading-relaxed cursor-pointer">
                            Receive appointment reminders and offers. You can opt out anytime.
                          </FormLabel>
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Book Button */}
            <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 rounded-b-xl">
              <Button
                type="submit"
                className={cn("w-full font-semibold h-12", theme.serviceSelected)}
                disabled={
                  bookingMutation.isPending || 
                  !selectedDate || 
                  !form.watch("startTime") ||
                  !getAvailableSlots().includes(form.watch("startTime"))
                }
                data-testid="button-book"
              >
                <div className="flex items-center justify-center gap-2 w-full">
                  <span>
                    {bookingMutation.isPending ? "Booking..." : "Book Appointment"}
                  </span>
                  {selectedService && (
                    <Badge variant="secondary" className="text-sm font-semibold">
                      ${selectedService.price}
                    </Badge>
                  )}
                </div>
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}