import { useState } from "react";
import { useLocation } from "wouter";
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameDay, 
  isSameMonth, 
  isToday,
  addMonths,
  subMonths,
  startOfDay,
  endOfDay
} from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsPage } from "./clients-page";
import { ProfileCompletionCard } from "@/components/profile-completion-card";
import { isProfileComplete, serviceFormSchema, type StylistService, type Client, type Coupon } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { 
  Calendar, 
  Users, 
  Tags, 
  Star, 
  Bell, 
  ChevronDown, 
  User,
  Settings,
  LogOut,
  Scissors,
  CalendarCheck,
  Plus,
  UserPlus,
  Share,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  TrendingUp,
  Ticket
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type ServiceFormData = z.infer<typeof serviceFormSchema>;

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("calendar");
  const [showProfileCompletion, setShowProfileCompletion] = useState(
    user ? !isProfileComplete(user) : false
  );

  // Services management state
  const [editingService, setEditingService] = useState<StylistService | null>(null);
  const [isServiceDialogOpen, setIsServiceDialogOpen] = useState(false);
  const [deleteServiceId, setDeleteServiceId] = useState<number | null>(null);

  // Calendar state
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isDateDrawerOpen, setIsDateDrawerOpen] = useState(false);

  // Services query
  const { data: services = [], isLoading: servicesLoading } = useQuery<StylistService[]>({
    queryKey: ["/api/services"],
  });

  // Clients query for dashboard stats
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  // Active coupons query for dashboard stats
  const { data: coupons = [], isLoading: couponsLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  // Count active coupons (not expired)
  const activeCouponsCount = coupons.filter((coupon) => {
    const now = new Date();
    // Use endOfDay comparison to ensure coupons are valid until end of expiry date
    // Use startOfDay comparison to ensure coupons are counted from start of valid date
    return endOfDay(new Date(coupon.endDate)) >= startOfDay(now) && 
           (!coupon.startDate || startOfDay(new Date(coupon.startDate)) <= endOfDay(now));
  }).length;

  // Get today's date string
  const today = format(new Date(), "yyyy-MM-dd");

  // Today's appointments query
  const { data: todaysAppointments = [], isLoading: todaysAppointmentsLoading } = useQuery<any[]>({
    queryKey: [`/api/appointments?date=${today}`],
  });

  // Today's open slots query
  const { data: todaysSlots, isLoading: todaysSlotsLoading } = useQuery<{ total: number; available: number }>({
    queryKey: [`/api/slots-count/${today}`],
  });

  // Today's availability status query
  const { data: todaysAvailability, isLoading: todaysAvailabilityLoading } = useQuery<{ isOpen: boolean; timeRanges?: any[] }>({
    queryKey: [`/api/availability/${today}`],
  });

  // New bookings today (appointments created today)
  const { data: allAppointments = [], isLoading: allAppointmentsLoading } = useQuery<any[]>({
    queryKey: ["/api/appointments"],
  });

  // Filter appointments created today
  const newBookingsToday = allAppointments.filter((appointment: any) => {
    if (!appointment.createdAt) return false;
    const createdAt = new Date(appointment.createdAt);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    return createdAt >= todayStart && createdAt <= todayEnd;
  });

  // Availability query for calendar month (slot counts)
  const { data: monthAvailability = {} } = useQuery<Record<string, { total: number; available: number }>>({
    queryKey: ["/api/availability/month", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const availability: Record<string, { total: number; available: number }> = {};
      
      // Fetch slot counts for each day in the month
      const promises = days.map(async (date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        try {
          const response = await fetch(`/api/slots-count/${dateStr}`, {
            credentials: "include",
          });
          
          if (!response.ok) {
            // If no slot data, default to 0 slots
            availability[dateStr] = { total: 0, available: 0 };
            return;
          }
          
          const slotCounts = await response.json();
          availability[dateStr] = slotCounts;
        } catch (error) {
          // If no availability data, default to 0 slots
          availability[dateStr] = { total: 0, available: 0 };
        }
      });
      
      await Promise.all(promises);
      return availability;
    },
  });

  // Availability status query for calendar month (isOpen status)
  const { data: monthAvailabilityStatus = {} } = useQuery<Record<string, { isOpen: boolean }>>({
    queryKey: ["/api/availability-status/month", format(currentMonth, "yyyy-MM")],
    queryFn: async () => {
      const monthStart = startOfMonth(currentMonth);
      const monthEnd = endOfMonth(currentMonth);
      const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
      
      const availabilityStatus: Record<string, { isOpen: boolean }> = {};
      
      // Fetch availability status for each day in the month
      const promises = days.map(async (date) => {
        const dateStr = format(date, "yyyy-MM-dd");
        try {
          const response = await fetch(`/api/availability/${dateStr}`, {
            credentials: "include",
            cache: "no-store", // Force fresh response to avoid 304
          });
          
          // Handle 304 (Not Modified) - refetch with cache reload
          if (response.status === 304) {
            const retryResponse = await fetch(`/api/availability/${dateStr}`, {
              credentials: "include",
              cache: "reload",
            });
            if (retryResponse.ok) {
              const availabilityData = await retryResponse.json();
              availabilityStatus[dateStr] = { isOpen: availabilityData.isOpen };
            } else {
              // If retry fails, assume open by default
              availabilityStatus[dateStr] = { isOpen: true };
            }
            return;
          }
          
          if (!response.ok) {
            // If no availability data, assume open by default
            availabilityStatus[dateStr] = { isOpen: true };
            return;
          }
          
          const availabilityData = await response.json();
          availabilityStatus[dateStr] = { isOpen: availabilityData.isOpen };
        } catch (error) {
          // If no availability data, assume open by default
          availabilityStatus[dateStr] = { isOpen: true };
        }
      });
      
      await Promise.all(promises);
      return availabilityStatus;
    },
  });

  // Service form
  const serviceForm = useForm<ServiceFormData>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      serviceName: "",
      price: 0,
      isCustom: false,
    },
  });

  // Service mutations
  const createServiceMutation = useMutation({
    mutationFn: (data: ServiceFormData) => 
      apiRequest("POST", "/api/services", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsServiceDialogOpen(false);
      serviceForm.reset();
      toast({
        title: "Success",
        description: "Service created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create service",
        variant: "destructive",
      });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ServiceFormData }) =>
      apiRequest("PATCH", `/api/services/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setIsServiceDialogOpen(false);
      setEditingService(null);
      serviceForm.reset();
      toast({
        title: "Success",
        description: "Service updated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update service",
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: (id: number) =>
      apiRequest("DELETE", `/api/services/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      setDeleteServiceId(null);
      toast({
        title: "Success",
        description: "Service deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete service",
        variant: "destructive",
      });
    },
  });

  // Service form handlers
  const handleServiceSubmit = (data: ServiceFormData) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleEditService = (service: StylistService) => {
    setEditingService(service);
    serviceForm.reset({
      serviceName: service.serviceName,
      price: parseFloat(service.price),
      isCustom: service.isCustom,
    });
    setIsServiceDialogOpen(true);
  };

  const handleAddNewService = () => {
    setEditingService(null);
    serviceForm.reset({
      serviceName: "",
      price: 0,
      isCustom: false,
    });
    setIsServiceDialogOpen(true);
  };

  const handleDeleteService = (serviceId: number) => {
    setDeleteServiceId(serviceId);
  };

  const confirmDeleteService = () => {
    if (deleteServiceId) {
      deleteServiceMutation.mutate(deleteServiceId);
    }
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Calendar helper functions
  const generateCalendarDays = (month: Date) => {
    const monthStart = startOfMonth(month);
    const monthEnd = endOfMonth(month);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Monday start
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    
    return eachDayOfInterval({
      start: calendarStart,
      end: calendarEnd,
    });
  };

  // Calendar event handlers
  const handlePreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(prev => addMonths(prev, 1));
  };

  const handleTodayClick = () => {
    setCurrentMonth(new Date());
  };

  // Navigate to Calendar tab with today's date selected and open availability editor
  const handleNavigateToTodayAvailability = () => {
    const today = new Date();
    const dateStr = format(today, "yyyy-MM-dd");
    setLocation(`/dashboard/calendar/${dateStr}`);
  };

  const [, setLocation] = useLocation();

  const handleDateClick = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    setLocation(`/dashboard/calendar/${dateString}`);
  };

  // Get user initials
  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const stats = [
    {
      title: "Today's Appointments",
      value: todaysAppointmentsLoading ? "..." : todaysAppointments.length.toString(),
      icon: CalendarCheck,
      bgColor: "bg-primary/10",
      iconColor: "text-primary",
      tooltip: "Number of appointments scheduled for today",
      isLoading: todaysAppointmentsLoading
    },
    {
      title: "Open Time Slots Today",
      value: (() => {
        if (todaysSlotsLoading || todaysAvailabilityLoading) return "...";
        
        // Check if availability is not set (no availability data or total slots is 0)
        const isNotSet = !todaysAvailability || (todaysSlots?.total === 0);
        
        if (isNotSet) {
          return "Not Set Yet — Click to Add";
        } else {
          const availableSlots = todaysSlots?.available || 0;
          const totalSlots = todaysSlots?.total || 0;
          
          if (totalSlots > 0 && availableSlots === 0) {
            return "0 (All Past)";
          } else {
            return `${availableSlots}`;
          }
        }
      })(),
      icon: Clock,
      bgColor: "bg-green-50 dark:bg-green-950", 
      iconColor: "text-green-600 dark:text-green-400",
      tooltip: (() => {
        const isNotSet = !todaysAvailability || (todaysSlots?.total === 0);
        if (isNotSet) {
          return "Click to set your availability for today";
        } else {
          const availableSlots = todaysSlots?.available || 0;
          const totalSlots = todaysSlots?.total || 0;
          
          if (totalSlots > 0 && availableSlots === 0) {
            return "All time slots are booked for today. Click to edit availability.";
          } else {
            return "Number of unbooked time slots available today. Click to edit.";
          }
        }
      })(),
      isLoading: todaysSlotsLoading || todaysAvailabilityLoading,
      isClickable: true,
      onClick: handleNavigateToTodayAvailability
    },
    {
      title: "New Bookings Today",
      value: allAppointmentsLoading ? "..." : newBookingsToday.length.toString(),
      icon: TrendingUp,
      bgColor: "bg-blue-50 dark:bg-blue-950",
      iconColor: "text-blue-600 dark:text-blue-400",
      tooltip: "Number of appointments created today (regardless of appointment date)",
      isLoading: allAppointmentsLoading
    },
    {
      title: "Total Clients",
      value: clients.length.toString(),
      icon: Users,
      bgColor: "bg-purple-50 dark:bg-purple-950",
      iconColor: "text-purple-600 dark:text-purple-400",
      tooltip: "Total number of clients in your database",
      isLoading: false
    },
    {
      title: "Active Coupons",
      value: couponsLoading ? "..." : activeCouponsCount.toString(),
      icon: Ticket,
      bgColor: "bg-orange-50 dark:bg-orange-950",
      iconColor: "text-orange-600 dark:text-orange-400",
      tooltip: "Number of active coupons that haven't expired yet",
      isLoading: couponsLoading
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top Navigation */}
      <header className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Business Name */}
            <div className="flex items-center space-x-4">
              <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
                <Scissors className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-card-foreground">StylistPro</h1>
                <p className="text-sm text-muted-foreground" data-testid="text-business-name">
                  {user?.businessName || "Your Business"}
                </p>
              </div>
            </div>

            {/* User Menu */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative" data-testid="button-notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute top-2 right-2 h-2 w-2 bg-destructive rounded-full"></span>
              </Button>

              {/* User Avatar and Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-3 h-auto p-2" data-testid="button-user-menu">
                    <div className="h-8 w-8 bg-primary rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-primary-foreground">
                        {user?.email ? getUserInitials(user.email) : "U"}
                      </span>
                    </div>
                    <div className="text-left hidden sm:block">
                      <p className="text-sm font-medium text-card-foreground" data-testid="text-user-email">
                        {user?.email}
                      </p>
                      <p className="text-xs text-muted-foreground">Stylist</p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem data-testid="menu-profile">
                    <User className="mr-2 h-4 w-4" />
                    Profile Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem data-testid="menu-business-settings">
                    <Settings className="mr-2 h-4 w-4" />
                    Business Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={handleLogout}
                    className="text-destructive focus:text-destructive"
                    data-testid="menu-logout"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Completion Card */}
        {user && showProfileCompletion && (
          <ProfileCompletionCard 
            onDismiss={() => setShowProfileCompletion(false)}
          />
        )}

        {/* Welcome Section */}
        <div className="mb-8">
          <div className="bg-gradient-to-r from-primary to-secondary rounded-lg p-6 text-primary-foreground">
            <h1 className="text-2xl font-bold mb-2" data-testid="text-welcome">
              Welcome back, {user?.businessName ? user.businessName.split(' ')[0] : 'Stylist'}! 👋
            </h1>
            <p className="opacity-90">Here's what's happening with your business today.</p>
          </div>
          
          {/* Quick Stats */}
          <TooltipProvider>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mt-6">
              {stats.map((stat, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <Card 
                      className={`border border-border hover:shadow-md transition-shadow ${
                        stat.isClickable ? 'cursor-pointer hover:bg-muted/50' : 'cursor-help'
                      }`}
                      onClick={stat.isClickable ? stat.onClick : undefined}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                            <div className="flex items-center justify-between mt-1">
                              <p 
                                className={`text-card-foreground ${
                                  stat.title === "Open Time Slots Today" && (stat.value?.includes("Not Set Yet") || stat.value?.includes("Fully Booked"))
                                    ? "text-lg font-medium" 
                                    : "text-2xl font-bold"
                                }`} 
                                data-testid={`stat-${stat.title.toLowerCase().replace(/['.\s]/g, '-')}`}
                              >
                                {stat.value}
                              </p>
                              {stat.isClickable && !stat.isLoading && (
                                <Button variant="ghost" size="sm" className="ml-2 p-1 h-auto">
                                  <Edit className="h-4 w-4 text-muted-foreground" />
                                </Button>
                              )}
                            </div>
                          </div>
                          <div className={`h-12 w-12 ${stat.bgColor} rounded-full flex items-center justify-center ml-4`}>
                            <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{stat.tooltip}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
        </div>

        {/* Tab Navigation and Content */}
        <Card className="border border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="border-b border-border">
              <TabsList className="w-full justify-start h-auto p-0 bg-transparent rounded-none">
                <TabsTrigger 
                  value="calendar" 
                  className="flex items-center space-x-2 py-4 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
                  data-testid="tab-calendar"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="clients" 
                  className="flex items-center space-x-2 py-4 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
                  data-testid="tab-clients"
                >
                  <Users className="h-4 w-4" />
                  <span>Clients</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="services" 
                  className="flex items-center space-x-2 py-4 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
                  data-testid="tab-services"
                >
                  <Scissors className="h-4 w-4" />
                  <span>Services</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="coupons" 
                  className="flex items-center space-x-2 py-4 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
                  data-testid="tab-coupons"
                >
                  <Tags className="h-4 w-4" />
                  <span>Coupons</span>
                </TabsTrigger>
                <TabsTrigger 
                  value="reviews" 
                  className="flex items-center space-x-2 py-4 px-6 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:bg-transparent rounded-none"
                  data-testid="tab-reviews"
                >
                  <Star className="h-4 w-4" />
                  <span>Reviews</span>
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="p-6">
              {/* Calendar Tab */}
              <TabsContent value="calendar" className="mt-0">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-4">
                    <h2 className="text-xl font-semibold text-card-foreground">
                      {format(currentMonth, "MMMM yyyy")}
                    </h2>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handlePreviousMonth}
                        data-testid="button-prev-month"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleNextMonth}
                        data-testid="button-next-month"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTodayClick}
                        data-testid="button-today"
                      >
                        Today
                      </Button>
                    </div>
                  </div>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-new-appointment">
                    <Plus className="mr-2 h-4 w-4" />
                    New Appointment
                  </Button>
                </div>
                
                {/* Calendar Grid */}
                <div className="bg-background border border-border rounded-lg overflow-hidden">
                  {/* Week Header */}
                  <div className="grid grid-cols-7 border-b border-border bg-muted/50">
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(day => (
                      <div key={day} className="p-3 text-center text-sm font-medium text-muted-foreground">
                        {day}
                      </div>
                    ))}
                  </div>
                  
                  {/* Calendar Days */}
                  <div className="grid grid-cols-7">
                    {generateCalendarDays(currentMonth).map((date, index) => {
                      const isCurrentMonth = isSameMonth(date, currentMonth);
                      const isToday = isSameDay(date, new Date());
                      const isSelected = selectedDate && isSameDay(date, selectedDate);
                      const dateStr = format(date, "yyyy-MM-dd");
                      const daySlots = monthAvailability[dateStr];
                      const dayStatus = monthAvailabilityStatus[dateStr];
                      const isUnavailable = dayStatus && dayStatus.isOpen === false;
                      const hasAvailability = daySlots && daySlots.available > 0 && !isUnavailable;
                      const isFullyBooked = daySlots && daySlots.total > 0 && daySlots.available === 0 && !isUnavailable;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handleDateClick(date)}
                          className={`
                            aspect-square p-2 text-sm border-r border-b border-border hover:bg-muted/50 transition-colors relative
                            ${!isCurrentMonth ? "text-muted-foreground bg-muted/20" : "text-card-foreground"}
                            ${isUnavailable && isCurrentMonth ? "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700" : ""}
                            ${isToday && !isUnavailable ? "bg-primary text-primary-foreground hover:bg-primary/90 font-medium" : ""}
                            ${isSelected && !isUnavailable ? "bg-accent text-accent-foreground" : ""}
                            ${isSelected && isUnavailable ? "bg-gray-200 dark:bg-gray-700" : ""}
                            ${index % 7 === 6 ? "border-r-0" : ""}
                            ${index >= (generateCalendarDays(currentMonth).length - 7) ? "border-b-0" : ""}
                          `}
                          data-testid={`calendar-day-${dateStr}`}
                        >
                          <div className="w-full h-full flex flex-col items-center justify-center">
                            <span className={`${isToday && !isUnavailable ? "font-bold" : ""} ${isUnavailable ? "line-through" : ""}`}>
                              {format(date, "d")}
                            </span>
                            
                            {/* Availability indicators */}
                            {isCurrentMonth && (
                              <div className="mt-1 flex flex-col items-center space-y-1">
                                {isUnavailable && (
                                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400" data-testid={`unavailable-text-${dateStr}`}>
                                    Unavailable
                                  </span>
                                )}
                                {hasAvailability && (
                                  <>
                                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full" data-testid={`availability-dot-${dateStr}`} />
                                    <span className="text-xs font-medium text-green-600 dark:text-green-400" data-testid={`availability-count-${dateStr}`}>
                                      {daySlots.available}
                                    </span>
                                  </>
                                )}
                                {isFullyBooked && (
                                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" data-testid={`fully-booked-dot-${dateStr}`} />
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </TabsContent>

              {/* Clients Tab */}
              <TabsContent value="clients" className="mt-0">
                <ClientsPage />
              </TabsContent>

              {/* Services Tab */}
              <TabsContent value="services" className="mt-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-card-foreground">Service Management</h2>
                  <Button 
                    onClick={handleAddNewService}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground" 
                    data-testid="button-add-service"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Service
                  </Button>
                </div>
                
                {/* Services List */}
                {servicesLoading ? (
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Scissors className="h-8 w-8 text-primary animate-pulse" />
                      </div>
                      <h3 className="text-lg font-medium text-card-foreground mb-2">Loading Services...</h3>
                    </div>
                  </div>
                ) : services.length === 0 ? (
                  <div className="bg-muted rounded-lg p-8 text-center">
                    <div className="max-w-sm mx-auto">
                      <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Scissors className="h-8 w-8 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium text-card-foreground mb-2">No Services Yet</h3>
                      <p className="text-muted-foreground mb-4">Create your first service to get started with pricing and service management.</p>
                      <Button 
                        onClick={handleAddNewService}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                        data-testid="button-add-first-service"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Your First Service
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {services.map((service) => (
                      <Card key={service.id} className="border border-border">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center">
                                  <Scissors className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                  <h3 className="font-medium text-card-foreground" data-testid={`service-name-${service.id}`}>
                                    {service.serviceName}
                                  </h3>
                                  <p className="text-sm text-muted-foreground">
                                    {service.isCustom ? "Custom Service" : "Standard Service"}
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center space-x-4">
                              <div className="text-right">
                                <p className="font-semibold text-lg text-card-foreground" data-testid={`service-price-${service.id}`}>
                                  ${parseFloat(service.price).toFixed(2)}
                                </p>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEditService(service)}
                                  data-testid={`button-edit-service-${service.id}`}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDeleteService(service.id)}
                                  className="text-destructive hover:text-destructive"
                                  data-testid={`button-delete-service-${service.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Coupons Tab */}
              <TabsContent value="coupons" className="mt-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-card-foreground">Coupon Management</h2>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-create-coupon">
                    <Plus className="mr-2 h-4 w-4" />
                    Create Coupon
                  </Button>
                </div>
                
                <div className="bg-muted rounded-lg p-8 text-center">
                  <div className="max-w-sm mx-auto">
                    <div className="h-16 w-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
                      <Tags className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-card-foreground mb-2">Promo Engine Coming Soon</h3>
                    <p className="text-muted-foreground">Create and manage promotional campaigns to attract and retain customers.</p>
                  </div>
                </div>
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews" className="mt-0">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-semibold text-card-foreground">Customer Reviews</h2>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-share-review-link">
                    <Share className="mr-2 h-4 w-4" />
                    Share Review Link
                  </Button>
                </div>
                
                <div className="bg-muted rounded-lg p-8 text-center">
                  <div className="max-w-sm mx-auto">
                    <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Star className="h-8 w-8 text-yellow-500" />
                    </div>
                    <h3 className="text-lg font-medium text-card-foreground mb-2">Review System Coming Soon</h3>
                    <p className="text-muted-foreground">Collect and manage customer reviews to build your reputation and improve services.</p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </Card>

        {/* Service Management Dialog */}
        <Dialog open={isServiceDialogOpen} onOpenChange={setIsServiceDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editingService ? "Edit Service" : "Add New Service"}
              </DialogTitle>
            </DialogHeader>
            <Form {...serviceForm}>
              <form onSubmit={serviceForm.handleSubmit(handleServiceSubmit)} className="space-y-4">
                <FormField
                  control={serviceForm.control}
                  name="serviceName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Service Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Women's Haircut" 
                          {...field} 
                          data-testid="input-service-name"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={serviceForm.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Price ($USD)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number"
                          placeholder="0.00"
                          step="0.01"
                          min="0.01"
                          max="9999.99"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          data-testid="input-service-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsServiceDialogOpen(false)}
                    data-testid="button-cancel-service"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createServiceMutation.isPending || updateServiceMutation.isPending}
                    data-testid="button-save-service"
                  >
                    {createServiceMutation.isPending || updateServiceMutation.isPending 
                      ? "Saving..." 
                      : editingService ? "Update Service" : "Create Service"
                    }
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteServiceId} onOpenChange={() => setDeleteServiceId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Service</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this service? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteService}
                disabled={deleteServiceMutation.isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                data-testid="button-confirm-delete"
              >
                {deleteServiceMutation.isPending ? "Deleting..." : "Delete Service"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Date Details Drawer */}
        <Drawer open={isDateDrawerOpen} onOpenChange={setIsDateDrawerOpen}>
          <DrawerContent>
            <div className="mx-auto w-full max-w-sm">
              <DrawerHeader>
                <DrawerTitle>
                  {selectedDate ? format(selectedDate, "EEEE, MMMM d, yyyy") : "Select a Date"}
                </DrawerTitle>
                <DrawerDescription>
                  {selectedDate && isToday(selectedDate) 
                    ? "Today's appointments and schedule" 
                    : "View and manage appointments for this date"
                  }
                </DrawerDescription>
              </DrawerHeader>
              
              <div className="p-4 pb-0">
                <div className="space-y-4">
                  {/* Today's date badge */}
                  {selectedDate && isToday(selectedDate) && (
                    <div className="bg-primary/10 text-primary text-sm px-3 py-1.5 rounded-full text-center font-medium">
                      <CalendarDays className="inline h-4 w-4 mr-1" />
                      Today
                    </div>
                  )}
                  
                  {/* Placeholder for appointments */}
                  <div className="text-center py-8">
                    <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
                      <Calendar className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">No appointments scheduled</p>
                    <Button 
                      size="sm" 
                      className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      data-testid="button-add-appointment"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Appointment
                    </Button>
                  </div>
                </div>
              </div>
              
              <DrawerFooter>
                <DrawerClose asChild>
                  <Button variant="outline" data-testid="button-close-drawer">Close</Button>
                </DrawerClose>
              </DrawerFooter>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
}
