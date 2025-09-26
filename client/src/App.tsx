import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import DashboardPage from "@/pages/dashboard-page";
import ProfileSetupPage from "@/pages/profile-setup-page";
import DailyAvailabilityPage from "@/pages/daily-availability-page";
import CouponCreatePage from "@/pages/coupon-create-page";
import CouponSendPage from "@/pages/coupon-send-page";
import PublicBookingPage from "@/pages/public-booking-page";
import TodayAppointmentsPage from "@/pages/today-appointments-page";
import BusinessSettingsPage from "@/pages/business-settings-page";
import ClientPage from "@/pages/ClientPage";
import CustomizeAppPage from "@/pages/customize-app";
import PublicAppPage from "@/pages/public-app-page";
import AppPreviewPage from "@/pages/app-preview";

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/profile-setup" component={ProfileSetupPage} />
      <ProtectedRoute path="/dashboard/calendar/:date" component={DailyAvailabilityPage} />
      <ProtectedRoute path="/dashboard/today-appointments" component={TodayAppointmentsPage} />
      <ProtectedRoute path="/coupons/create" component={CouponCreatePage} />
      <ProtectedRoute path="/coupons/:id/send" component={CouponSendPage} />
      <ProtectedRoute path="/clients/:id" component={ClientPage} />
      <ProtectedRoute path="/settings/business" component={BusinessSettingsPage} />
      <ProtectedRoute path="/dashboard/customize-app" component={CustomizeAppPage} />
      <ProtectedRoute path="/app/preview" component={AppPreviewPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/app/:slug" component={PublicAppPage} />
      <Route path="/book/:stylistId" component={PublicBookingPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
