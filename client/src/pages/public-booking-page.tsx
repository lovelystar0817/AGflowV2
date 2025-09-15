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
import { CalendarDays, Clock, User, Phone, Scissors, CheckCircle } from "lucide-react";
import { z } from "zod";

// Combined schema for booking form
const bookingFormSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().min(10, "Phone number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  serviceId: z.number().min(1, "Please select a service"),
  date: z.date({ required_error: "Please select a date" }),
  startTime: z.string().min(1, "Please select a time"),
});

type BookingFormData = z.infer<typeof bookingFormSchema>;

export default function PublicBookingPage() {
  const { stylistId } = useParams();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Fetch stylist details
  const { data: stylist, isLoading: stylistLoading } = useQuery<Stylist>({
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
      toast({
        title: "Booking failed",
        description: error.message,
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
    
    return filterAvailableSlots(allSlots, bookedSlots);
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
                <span>Time: {form.getValues("startTime")}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-950 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Scissors className="h-6 w-6 text-primary" />
              <h1 className="text-2xl font-bold">
                {stylist.firstName} {stylist.lastName}
              </h1>
            </div>
            {stylist.businessName && (
              <p className="text-gray-600 dark:text-gray-400">{stylist.businessName}</p>
            )}
            {stylist.location && (
              <p className="text-sm text-gray-500 dark:text-gray-500">{stylist.location}</p>
            )}
          </div>
        </div>
      </div>

      {/* Booking Form */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Personal Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your first name" {...field} data-testid="input-firstName" />
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
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your last name" {...field} data-testid="input-lastName" />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your phone number" {...field} data-testid="input-phone" />
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
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" {...field} data-testid="input-email" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Service Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scissors className="h-5 w-5" />
                  Select Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value ? field.value.toString() : ""}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-service">
                            <SelectValue placeholder="Choose a service" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {services?.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              <div className="flex items-center justify-between w-full">
                                <span>{service.serviceName}</span>
                                <Badge variant="secondary" className="ml-2">
                                  ${service.price}
                                </Badge>
                              </div>
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

            {/* Date Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarDays className="h-5 w-5" />
                  Select Date
                </CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => {
                          field.onChange(date);
                          setSelectedDate(date);
                          // Reset time selection when date changes
                          form.setValue("startTime", "");
                        }}
                        disabled={(date) => {
                          const today = new Date();
                          today.setHours(0, 0, 0, 0); // Reset to start of day
                          return date < today;
                        }}
                        initialFocus
                        className="rounded-md border"
                      />
                      <FormMessage />

                      {/* Time Selection - Inline with Calendar */}
                      {selectedDate && (
                        <div className="mt-6 pt-6 border-t border-border">
                          <div className="flex items-center gap-2 mb-4">
                            <Clock className="h-5 w-5" />
                            <h3 className="text-lg font-medium">Available Times</h3>
                          </div>
                          
                          <FormField
                            control={form.control}
                            name="startTime"
                            render={({ field }) => (
                              <FormItem>
                                {availabilityLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                                    <span className="ml-2 text-muted-foreground">Loading available times...</span>
                                  </div>
                                ) : getAvailableSlots().length === 0 ? (
                                  <div className="text-center py-8">
                                    <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                                    <p className="text-muted-foreground">No available times for this date</p>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                    {getAvailableSlots().map((slot) => (
                                      <Button
                                        key={slot}
                                        type="button"
                                        variant={field.value === slot ? "default" : "outline"}
                                        className="h-10 text-sm"
                                        onClick={() => field.onChange(slot)}
                                        data-testid={`time-slot-${slot.replace(':', '-')}`}
                                      >
                                        {slot}
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

            {/* Book Button */}
            <Button
              type="submit"
              size="lg"
              className="w-full"
              disabled={
                bookingMutation.isPending || 
                !selectedDate || 
                !form.watch("startTime") ||
                !getAvailableSlots().includes(form.watch("startTime"))
              }
              data-testid="button-book"
            >
              {bookingMutation.isPending ? "Booking..." : "Book Appointment"}
              {selectedService && (
                <Badge variant="secondary" className="ml-2">
                  ${selectedService.price}
                </Badge>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}