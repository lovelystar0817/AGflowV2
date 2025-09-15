import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, CalendarCheck, Clock, User, Phone, DollarSign } from "lucide-react";
import { type Appointment } from "@shared/schema";

// Extended appointment type with client and service details
interface AppointmentWithDetails extends Appointment {
  client: {
    id: string;
    name: string;
    email: string;
    phone?: string;
  };
  service: {
    id: number;
    serviceName: string;
    price: string;
  };
}

export default function TodayAppointmentsPage() {
  const [, setLocation] = useLocation();
  const today = format(new Date(), "yyyy-MM-dd");

  // Convert 24-hour format to 12-hour format for display consistency
  const convertTo12Hour = (time24: string): string => {
    const [hours, minutes] = time24.split(':').map(Number);
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const ampm = hours < 12 ? 'AM' : 'PM';
    return `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Query to get today's appointments with client and service details
  const { data: appointments = [], isLoading } = useQuery<AppointmentWithDetails[]>({
    queryKey: ['/api/appointments/details', today],
  });

  const handleBackToDashboard = () => {
    setLocation("/");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBackToDashboard}
              className="mr-4"
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold text-card-foreground">Today's Appointments</h1>
          </div>
          
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-1/4 mb-2"></div>
                  <div className="h-6 bg-muted rounded w-1/2 mb-4"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-muted rounded w-1/3"></div>
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center mb-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToDashboard}
            className="mr-4"
            data-testid="button-back-dashboard"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-card-foreground">Today's Appointments</h1>
            <p className="text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
          </div>
        </div>

        {/* Summary Card */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                  <CalendarCheck className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-card-foreground">
                    {appointments.length} Appointment{appointments.length !== 1 ? 's' : ''} Today
                  </h3>
                  <p className="text-muted-foreground">
                    {appointments.length === 0 
                      ? "No appointments scheduled for today" 
                      : `Your schedule for ${format(new Date(), "EEEE")}`
                    }
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Appointments List */}
        <div className="space-y-4">
          {appointments.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="max-w-sm mx-auto">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                    <CalendarCheck className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium text-card-foreground mb-2">No Appointments Today</h3>
                  <p className="text-muted-foreground mb-6">
                    You have a free day! Relax or catch up on other tasks.
                  </p>
                  <Button 
                    onClick={handleBackToDashboard}
                    variant="outline"
                    data-testid="button-back-to-dashboard"
                  >
                    Back to Dashboard
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            appointments.map((appointment) => (
              <Card key={appointment.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Time and Status */}
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="h-4 w-4 text-primary" />
                          <span className="font-semibold text-lg text-card-foreground" data-testid={`time-${appointment.id}`}>
                            {convertTo12Hour(appointment.startTime)} - {convertTo12Hour(appointment.endTime)}
                          </span>
                        </div>
                        <Badge 
                          variant={appointment.status === "confirmed" ? "default" : "secondary"}
                          data-testid={`status-${appointment.id}`}
                        >
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </Badge>
                      </div>

                      {/* Client Information */}
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-card-foreground" data-testid={`client-name-${appointment.id}`}>
                            {appointment.client.name}
                          </span>
                        </div>

                        {appointment.client.phone && (
                          <div className="flex items-center space-x-2">
                            <Phone className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground" data-testid={`client-phone-${appointment.id}`}>
                              {appointment.client.phone}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center space-x-2">
                          <div className="h-4 w-4 flex items-center justify-center">
                            ✂️
                          </div>
                          <span className="text-muted-foreground" data-testid={`service-name-${appointment.id}`}>
                            {appointment.service.serviceName}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium text-green-600 dark:text-green-400" data-testid={`price-${appointment.id}`}>
                            ${appointment.service.price}
                          </span>
                        </div>

                        {appointment.notes && (
                          <div className="mt-3 p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground" data-testid={`notes-${appointment.id}`}>
                              <strong>Notes:</strong> {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}