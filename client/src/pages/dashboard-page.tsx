import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClientsPage } from "./clients-page";
import { ProfileCompletionCard } from "@/components/profile-completion-card";
import { isProfileComplete } from "@shared/schema";
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
  Share
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

export default function DashboardPage() {
  const { user, logoutMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("calendar");
  const [showProfileCompletion, setShowProfileCompletion] = useState(
    user ? !isProfileComplete(user) : false
  );

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Get user initials
  const getUserInitials = (email: string) => {
    return email.split('@')[0].slice(0, 2).toUpperCase();
  };

  const stats = [
    {
      title: "Today's Appointments",
      value: "0",
      icon: CalendarCheck,
      bgColor: "bg-primary/10",
      iconColor: "text-primary"
    },
    {
      title: "Total Clients",
      value: "0",
      icon: Users,
      bgColor: "bg-secondary/20",
      iconColor: "text-secondary"
    },
    {
      title: "Active Coupons",
      value: "0",
      icon: Tags,
      bgColor: "bg-accent",
      iconColor: "text-primary"
    },
    {
      title: "Avg. Rating",
      value: "0.0",
      icon: Star,
      bgColor: "bg-yellow-100",
      iconColor: "text-yellow-500"
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
            {stats.map((stat, index) => (
              <Card key={index} className="border border-border">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold text-card-foreground" data-testid={`stat-${stat.title.toLowerCase().replace(/['.\s]/g, '-')}`}>
                        {stat.value}
                      </p>
                    </div>
                    <div className={`h-12 w-12 ${stat.bgColor} rounded-full flex items-center justify-center`}>
                      <stat.icon className={`h-6 w-6 ${stat.iconColor}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
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
                  <h2 className="text-xl font-semibold text-card-foreground">Appointment Calendar</h2>
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-new-appointment">
                    <Plus className="mr-2 h-4 w-4" />
                    New Appointment
                  </Button>
                </div>
                
                <div className="bg-muted rounded-lg p-8 text-center">
                  <div className="max-w-sm mx-auto">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Calendar className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-card-foreground mb-2">Calendar Integration Coming Soon</h3>
                    <p className="text-muted-foreground">Your appointment calendar will be displayed here with booking management capabilities.</p>
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
                  <Button className="bg-primary hover:bg-primary/90 text-primary-foreground" data-testid="button-add-service">
                    <Plus className="mr-2 h-4 w-4" />
                    Add New Service
                  </Button>
                </div>
                
                {/* Services will be implemented here */}
                <div className="bg-muted rounded-lg p-8 text-center">
                  <div className="max-w-sm mx-auto">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Scissors className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-medium text-card-foreground mb-2">Manage Your Services</h3>
                    <p className="text-muted-foreground">Create and manage the services you offer with custom pricing.</p>
                  </div>
                </div>
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
      </div>
    </div>
  );
}
