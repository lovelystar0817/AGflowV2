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

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={DashboardPage} />
      <ProtectedRoute path="/profile-setup" component={ProfileSetupPage} />
      <ProtectedRoute path="/dashboard/calendar/:date" component={DailyAvailabilityPage} />
      <ProtectedRoute path="/coupons/create" component={CouponCreatePage} />
      <ProtectedRoute path="/coupons/:id/send" component={CouponSendPage} />
      <Route path="/auth" component={AuthPage} />
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
