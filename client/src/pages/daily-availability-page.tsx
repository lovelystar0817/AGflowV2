import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Plus, X, Clock, Edit, Trash2 } from "lucide-react";
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
const generateTimeSlots = (): { time24: string; time12: string; period: 'morning' | 'afternoon' | 'evening' }[] => {
  const slots: { time24: string; time12: string; period: 'morning' | 'afternoon' | 'evening' }[] = [];
  
  for (let hour = 6; hour <= 22; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      // Stop at 22:00 to keep within 6:00 AM - 10:00 PM window
      if (hour === 22 && minute > 0) break;
      
      const time24 = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      // Convert to 12-hour format
      const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
      const ampm = hour < 12 ? 'AM' : 'PM';
      const time12 = `${hour12}:${minute.toString().padStart(2, '0')} ${ampm}`;
      
      // Determine period
      let period: 'morning' | 'afternoon' | 'evening';
      if (hour < 12) {
        period = 'morning';
      } else if (hour < 18) {
        period = 'afternoon';
      } else {
        period = 'evening';
      }
      
      slots.push({ time24, time12, period });
    }
  }
  return slots;
};

const TIME_SLOTS = generateTimeSlots();
const TIME_SLOTS_24H = TIME_SLOTS.map(slot => slot.time24);

export default function DailyAvailabilityPage() {
  const params = useParams();
  const date = params.date;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(true);
  const [timeRanges, setTimeRanges] = useState<TimeRange[]>([]);
  const [selectedStart, setSelectedStart] = useState<string | null>(null);
  const [selectedEnd, setSelectedEnd] = useState<string | null>(null);

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
      // Invalidate monthly calendar queries to refresh the dashboard calendar
      const currentDate = new Date(date + 'T00:00:00');
      const monthKey = format(currentDate, "yyyy-MM");
      queryClient.invalidateQueries({ queryKey: ['/api/availability/month', monthKey] });
      queryClient.invalidateQueries({ queryKey: ['/api/availability-status/month', monthKey] });
      // Also invalidate slots count queries for this date
      queryClient.invalidateQueries({ queryKey: ['/api/slots-count', date] });
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

  const handleTimeSlotClick = (time24: string) => {
    if (!isOpen) return;

    if (selectedStart === null) {
      // Start selecting a range
      setSelectedStart(time24);
      setSelectedEnd(null);
    } else {
      // Set end time and show preview
      const startIndex = TIME_SLOTS_24H.indexOf(selectedStart);
      const endIndex = TIME_SLOTS_24H.indexOf(time24);
      
      if (endIndex <= startIndex) {
        toast({
          title: "Invalid range",
          description: "End time must be after start time.",
          variant: "destructive",
        });
        setSelectedStart(null);
        setSelectedEnd(null);
        return;
      }

      setSelectedEnd(time24);
    }
  };

  const confirmTimeRange = () => {
    if (!selectedStart || !selectedEnd) return;

    const newRange: TimeRange = {
      start: selectedStart,
      end: selectedEnd,
    };

    // Check for overlaps with existing ranges
    const startIndex = TIME_SLOTS_24H.indexOf(selectedStart);
    const endIndex = TIME_SLOTS_24H.indexOf(selectedEnd);
    
    const hasOverlap = timeRanges.some(range => {
      const existingStart = TIME_SLOTS_24H.indexOf(range.start);
      const existingEnd = TIME_SLOTS_24H.indexOf(range.end);
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
        TIME_SLOTS_24H.indexOf(a.start) - TIME_SLOTS_24H.indexOf(b.start)
      ));
      toast({
        title: "Time range added",
        description: `Added ${getTime12Hour(selectedStart)} - ${getTime12Hour(selectedEnd)}`,
      });
    }
    
    setSelectedStart(null);
    setSelectedEnd(null);
  };

  const cancelSelection = () => {
    setSelectedStart(null);
    setSelectedEnd(null);
  };

  const removeTimeRange = (index: number) => {
    setTimeRanges(timeRanges.filter((_, i) => i !== index));
    toast({
      title: "Time range removed",
      description: "The time range has been removed.",
    });
  };

  const getTime12Hour = (time24: string): string => {
    const slot = TIME_SLOTS.find(slot => slot.time24 === time24);
    return slot ? slot.time12 : time24;
  };

  const isTimeSlotInRange = (time24: string): boolean => {
    return timeRanges.some(range => {
      const timeIndex = TIME_SLOTS_24H.indexOf(time24);
      const startIndex = TIME_SLOTS_24H.indexOf(range.start);
      const endIndex = TIME_SLOTS_24H.indexOf(range.end);
      return timeIndex >= startIndex && timeIndex < endIndex;
    });
  };

  const isTimeSlotInSelection = (time24: string): boolean => {
    if (!selectedStart || !selectedEnd) return false;
    const timeIndex = TIME_SLOTS_24H.indexOf(time24);
    const startIndex = TIME_SLOTS_24H.indexOf(selectedStart);
    const endIndex = TIME_SLOTS_24H.indexOf(selectedEnd);
    return timeIndex >= startIndex && timeIndex < endIndex;
  };

  const editTimeRange = (index: number) => {
    const range = timeRanges[index];
    setSelectedStart(range.start);
    setSelectedEnd(range.end);
    removeTimeRange(index);
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
              {selectedStart && !selectedEnd
                ? `Click an end time to complete the range starting at ${getTime12Hour(selectedStart)}`
                : selectedStart && selectedEnd
                ? "Preview your time range below, then confirm to add it"
                : "Click a start time, then click an end time to create an available time range"
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Selection Preview */}
            {selectedStart && selectedEnd && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="font-medium text-blue-900 dark:text-blue-100">
                      Selected: {getTime12Hour(selectedStart)} - {getTime12Hour(selectedEnd)}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={confirmTimeRange} data-testid="button-confirm-range">
                      <Plus className="h-3 w-3 mr-1" />
                      Add Range
                    </Button>
                    <Button size="sm" variant="outline" onClick={cancelSelection} data-testid="button-cancel-range">
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Added Slots List */}
            {timeRanges.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Available Time Slots
                </h4>
                <div className="space-y-2">
                  {timeRanges.map((range, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg"
                      data-testid={`slot-${index}`}
                    >
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {getTime12Hour(range.start)} - {getTime12Hour(range.end)}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-green-100 dark:hover:bg-green-800"
                          onClick={() => editTimeRange(index)}
                          data-testid={`button-edit-range-${index}`}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 hover:bg-red-100 dark:hover:bg-red-800 text-red-600 dark:text-red-400"
                          onClick={() => removeTimeRange(index)}
                          data-testid={`button-delete-range-${index}`}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Time Slot Grid - Grouped by Period */}
            <div className="space-y-6">
              {/* Morning */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold text-amber-700 dark:text-amber-400">Morning</h5>
                  <Badge variant="outline" className="text-xs">6:00 AM – 11:30 AM</Badge>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {TIME_SLOTS.filter(slot => slot.period === 'morning').map((slot) => {
                    const isInRange = isTimeSlotInRange(slot.time24);
                    const isInSelection = isTimeSlotInSelection(slot.time24);
                    const isStartTime = selectedStart === slot.time24;
                    const isEndTime = selectedEnd === slot.time24;
                    
                    return (
                      <Button
                        key={slot.time24}
                        variant={
                          isInRange ? "default" : 
                          isStartTime ? "secondary" : 
                          isEndTime ? "secondary" :
                          "outline"
                        }
                        size="sm"
                        className={`h-9 text-xs font-medium ${
                          isInSelection ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600" : ""
                        } ${
                          isInRange ? "cursor-not-allowed opacity-50" : ""
                        } ${
                          isStartTime || isEndTime ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
                        }`}
                        onClick={() => handleTimeSlotClick(slot.time24)}
                        disabled={isInRange}
                        data-testid={`button-time-${slot.time24.replace(':', '-')}`}
                      >
                        {slot.time12}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Afternoon */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold text-blue-700 dark:text-blue-400">Afternoon</h5>
                  <Badge variant="outline" className="text-xs">12:00 PM – 5:30 PM</Badge>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {TIME_SLOTS.filter(slot => slot.period === 'afternoon').map((slot) => {
                    const isInRange = isTimeSlotInRange(slot.time24);
                    const isInSelection = isTimeSlotInSelection(slot.time24);
                    const isStartTime = selectedStart === slot.time24;
                    const isEndTime = selectedEnd === slot.time24;
                    
                    return (
                      <Button
                        key={slot.time24}
                        variant={
                          isInRange ? "default" : 
                          isStartTime ? "secondary" : 
                          isEndTime ? "secondary" :
                          "outline"
                        }
                        size="sm"
                        className={`h-9 text-xs font-medium ${
                          isInSelection ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600" : ""
                        } ${
                          isInRange ? "cursor-not-allowed opacity-50" : ""
                        } ${
                          isStartTime || isEndTime ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
                        }`}
                        onClick={() => handleTimeSlotClick(slot.time24)}
                        disabled={isInRange}
                        data-testid={`button-time-${slot.time24.replace(':', '-')}`}
                      >
                        {slot.time12}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {/* Evening */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h5 className="font-semibold text-purple-700 dark:text-purple-400">Evening</h5>
                  <Badge variant="outline" className="text-xs">6:00 PM – 10:00 PM</Badge>
                </div>
                <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
                  {TIME_SLOTS.filter(slot => slot.period === 'evening').map((slot) => {
                    const isInRange = isTimeSlotInRange(slot.time24);
                    const isInSelection = isTimeSlotInSelection(slot.time24);
                    const isStartTime = selectedStart === slot.time24;
                    const isEndTime = selectedEnd === slot.time24;
                    
                    return (
                      <Button
                        key={slot.time24}
                        variant={
                          isInRange ? "default" : 
                          isStartTime ? "secondary" : 
                          isEndTime ? "secondary" :
                          "outline"
                        }
                        size="sm"
                        className={`h-9 text-xs font-medium ${
                          isInSelection ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-600" : ""
                        } ${
                          isInRange ? "cursor-not-allowed opacity-50" : ""
                        } ${
                          isStartTime || isEndTime ? "ring-2 ring-blue-500 dark:ring-blue-400" : ""
                        }`}
                        onClick={() => handleTimeSlotClick(slot.time24)}
                        disabled={isInRange}
                        data-testid={`button-time-${slot.time24.replace(':', '-')}`}
                      >
                        {slot.time12}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>

            {selectedStart && !selectedEnd && (
              <p className="text-sm text-muted-foreground" data-testid="text-selection-help">
                <Clock className="h-4 w-4 inline mr-1" />
                Selecting range starting at {getTime12Hour(selectedStart)}. Click an end time above.
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