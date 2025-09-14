import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Plus, X, Clock } from "lucide-react";
import { format, parseISO } from "date-fns";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TimeRange } from "@shared/schema";

interface AvailabilityData {
  date: string;
  isOpen: boolean;
  timeRanges: TimeRange[];
}

// Generate 30-minute time slots from 6:00 AM to 10:00 PM
const generateTimeSlots = (): string[] => {
  const slots: string[] = [];
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Stop at 22:00 to keep within 6:00 AM - 10:00 PM window
      if (hour === 22 && minute > 0) break;
      const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();

export default function DailyAvailabilityPage() {
  const { date } = useParams<{ date: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(true);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);

  // Fetch current availability for the date
  const { data: availability, isLoading, error } = useQuery<AvailabilityData>({
    queryKey: ['/api/availability', date],
    enabled: !!date,
  });

  // Update availability mutation
  const updateAvailabilityMutation = useMutation({
    mutationFn: async (data: { isOpen: boolean; timeRanges: TimeRange[] }) => {
      return await apiRequest('PUT', `/api/availability/${date}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/availability', date] });
      toast({
        title: "Availability updated",
        description: "Your availability has been saved successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update availability. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Load data when availability is fetched
  useEffect(() => {
    if (availability) {
      setIsOpen(availability.isOpen);
      setTimeRanges(availability.timeRanges || []);
    }
  }, [availability]);

  const handleSave = () => {
    updateAvailabilityMutation.mutate({
      isOpen,
      timeRanges: isOpen ? timeRanges : [],
    });
  };

  const handleTimeSlotClick = (time: string) => {
    if (!isOpen) return;

    if (selectedStart === null) {
      // Start selecting a range
      setSelectedStart(time);
    } else {
      // Complete the range selection
      const startIndex = TIME_SLOTS.indexOf(selectedStart);
      const endIndex = TIME_SLOTS.indexOf(time);
      
      if (endIndex <= startIndex) {
        toast({
          title: "Invalid range",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        setSelectedStart(null);
        return;
      }

      const newRange: TimeRange = {
        start: selectedStart,
        end: time,
      };

      // Check for overlaps with existing ranges
      const hasOverlap = timeRanges.some(range => {
        const existingStart = TIME_SLOTS.indexOf(range.start);
        const existingEnd = TIME_SLOTS.indexOf(range.end);
        return !(endIndex <= existingStart || startIndex >= existingEnd);
      });

      if (hasOverlap) {
        toast({
          title: "Overlapping range",
          description: "This time range overlaps with an existing one.",
          variant: "destructive",
        });
      } else {
        setTimeRanges([...timeRanges, newRange].sort((a, b) => 
          TIME_SLOTS.indexOf(a.start) - TIME_SLOTS.indexOf(b.start)
        ));
        toast({
          title: "Time range added",
          description: `Added ${selectedStart} - ${time}`,
        });
      }
      
      setSelectedStart(null);
    }
  };

  const removeTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index));
    toast({
      title: "Time range removed",
      description: "The time range has been removed.",
    });
  };

  const isTimeSlotInRange = (time: string): boolean => {
    return timeRanges.some(range => {
      const timeIndex = TIME_SLOTS.indexOf(time);
      const startIndex = TIME_SLOTS.indexOf(range.start);
      const endIndex = TIME_SLOTS.indexOf(range.end);
      return timeIndex >= startIndex && timeIndex < endIndex;
    });
  };

  const isTimeSlotInSelection = (time: string): boolean => {
    if (!selectedStart) return false;
    const timeIndex = TIME_SLOTS.indexOf(time);
    const startIndex = TIME_SLOTS.indexOf(selectedStart);
    return timeIndex > startIndex;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4" data-testid="loading-availability">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4" data-testid="error-availability">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive mb-4">Failed to load availability data</p>
            <p className="text-sm text-muted-foreground">
              Don't worry - you can still set your availability for this date.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!date) {
    return (
      <div className="container mx-auto p-4" data-testid="error-no-date">
        <Card>
          <CardContent className="pt-6">
            <p className="text-destructive">No date specified</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = format(parseISO(date), "EEEE, MMMM d, yyyy");

  return (
    <div className="container mx-auto p-4 space-y-6" data-testid="daily-availability-page">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/')}
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Calendar
        </Button>
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Daily Availability</h1>
          <p className="text-muted-foreground" data-testid="text-date">{formattedDate}</p>
        </div>
      </div>

      {/* Availability Toggle */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Availability Status
          </CardTitle>
          <CardDescription>
            Set whether you're available for appointments on this date
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2">
            <Switch
              checked={isOpen}
              onCheckedChange={setIsOpen}
              data-testid="switch-availability"
            />
            <span className="font-medium">
              {isOpen ? "Available" : "Unavailable"}
            </span>
            {!isOpen && (
              <Badge variant="secondary" data-testid="badge-unavailable">
                Day Off
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Time Ranges */}
      {isOpen && (
        <Card>
          <CardHeader>
            <CardTitle>Available Time Ranges</CardTitle>
            <CardDescription>
              {selectedStart 
                ? `Click an end time to complete the range starting at ${selectedStart}`
                : "Click a start time, then click an end time to create an available time range"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Ranges */}
            {timeRanges.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium">Current Ranges:</h4>
                <div className="flex flex-wrap gap-2">
                  {timeRanges.map((range, index) => (
                    <Badge 
                      key={index}
                      variant="default"
                      className="px-3 py-1"
                      data-testid={`badge-range-${index}`}
                    >
                      {range.start} - {range.end}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 ml-2 hover:bg-transparent"
                        onClick={() => removeTimeRange(index)}
                        data-testid={`button-remove-range-${index}`}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Time Slot Grid */}
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {TIME_SLOTS.map((time) => {
                const isInRange = isTimeSlotInRange(time);
                const isInSelection = isTimeSlotInSelection(time);
                const isStartTime = selectedStart === time;
                
                return (
                  <Button
                    key={time}
                    variant={isInRange ? "default" : isStartTime ? "secondary" : "outline"}
                    size="sm"
                    className={`h-8 text-xs ${
                      isInSelection ? "bg-muted border-primary" : ""
                    } ${
                      isInRange ? "cursor-not-allowed opacity-50" : ""
                    }`}
                    onClick={() => handleTimeSlotClick(time)}
                    disabled={isInRange}
                    data-testid={`button-time-${time.replace(':', '-')}`}
                  >
                    {time}
                  </Button>
                );
              })}
            </div>

            {selectedStart && (
              <p className="text-sm text-muted-foreground" data-testid="text-selection-help">
                <Clock className="h-4 w-4 inline mr-1" />
                Selecting range starting at {selectedStart}. Click an end time above.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateAvailabilityMutation.isPending}
          data-testid="button-save"
        >
          {updateAvailabilityMutation.isPending ? "Saving..." : "Save Availability"}
        </Button>
      </div>
    </div>
  );
}