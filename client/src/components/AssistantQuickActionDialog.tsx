import { useEffect, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

// Define locally to avoid coupling to AssistantShortcuts typings
// Keep in sync with AssistantShortcuts quick action keys if that file reintroduces types later.
type QuickActionFormType = "add-client" | "book-appointment" | "appointments-today";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { insertClientSchema, type Client, type StylistService } from "@shared/schema";
import { Loader2 } from "lucide-react";

type AssistantQuickActionDialogProps = {
  action: QuickActionFormType | null;
  onClose: () => void;
};

const clientFormSchema = insertClientSchema
  .omit({ stylistId: true })
  .extend({
    firstName: z.string().min(1, "First name is required"),
    phone: z.string().min(1, "Phone number is required"),
  });

type ClientFormValues = z.infer<typeof clientFormSchema>;

const bookAppointmentSchema = z.object({
  clientId: z.string().uuid("Client is required"),
  serviceId: z.string().min(1, "Service is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Select a time"),
  notes: z.string().optional(),
  applyAutomations: z.boolean().default(true),
});

type BookAppointmentFormValues = z.infer<typeof bookAppointmentSchema>;

const rescheduleSchema = z.object({
  appointmentId: z.string().uuid("Appointment is required"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Select a date"),
  startTime: z.string().regex(/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/, "Select a time"),
  notes: z.string().optional(),
});

type RescheduleFormValues = z.infer<typeof rescheduleSchema>;

type TodayAppointment = {
  id: string;
  date: string;
  startTime: string;
  status: string;
  notes?: string | null;
  client: {
    id: string;
    firstName: string;
    lastName: string;
    name?: string;
    phone?: string | null;
    email?: string | null;
  };
  service: {
    id: number;
    serviceName: string;
  };
};

export function AssistantQuickActionDialog({ action, onClose }: AssistantQuickActionDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addClientForm = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      notes: "",
      optInMarketing: false,
    },
  });

  useEffect(() => {
    if (action !== "add-client") {
      addClientForm.reset({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        notes: "",
        optInMarketing: false,
      });
    }
  }, [action, addClientForm]);

  const bookAppointmentForm = useForm<BookAppointmentFormValues>({
    resolver: zodResolver(bookAppointmentSchema),
    defaultValues: {
      clientId: "",
      serviceId: "",
      date: "",
      startTime: "",
      notes: "",
      applyAutomations: true,
    },
  });

  useEffect(() => {
    if (action !== "book-appointment") {
      bookAppointmentForm.reset({
        clientId: "",
        serviceId: "",
        date: "",
        startTime: "",
        notes: "",
        applyAutomations: true,
      });
    }
  }, [action, bookAppointmentForm]);

  const rescheduleForm = useForm<RescheduleFormValues>({
    resolver: zodResolver(rescheduleSchema),
    defaultValues: {
      appointmentId: "",
      date: "",
      startTime: "",
      notes: "",
    },
  });

  const closeReschedule = () => {
    setRescheduleTarget(null);
    rescheduleForm.reset({
      appointmentId: "",
      date: "",
      startTime: "",
      notes: "",
    });
  };

  const [rescheduleTarget, setRescheduleTarget] = useState<string | null>(null);
  const [pendingActionId, setPendingActionId] = useState<string | null>(null);
  const [cancelDialog, setCancelDialog] = useState<{ id: string | null; note: string }>({ id: null, note: "" });

  useEffect(() => {
    if (action !== "appointments-today") {
      closeReschedule();
      setCancelDialog({ id: null, note: "" });
    }
  }, [action, rescheduleForm]);

  const mutation = useMutation({
    mutationFn: async (values: ClientFormValues) => {
      const response = await apiRequest("POST", "/api/clients", values);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
      toast({
        title: "Client added",
        description: `${data.firstName ?? "Client"} has been added.`,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Unable to add client",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
  });

  const { data: clientsResponse } = useQuery<{ items: Client[] }>({
    queryKey: ["/api/clients"],
    enabled: action === "book-appointment",
  });

  const { data: servicesResponse } = useQuery<{ items: StylistService[] }>({
    queryKey: ["/api/services"],
    enabled: action === "book-appointment",
  });

  const selectedDate = bookAppointmentForm.watch("date");

  const { data: availableSlots, isLoading: isLoadingSlots } = useQuery<string[]>({
    queryKey: ["/api/available-slots", selectedDate],
    enabled: action === "book-appointment" && Boolean(selectedDate),
    queryFn: async () => {
      const response = await fetch(`/api/available-slots/${selectedDate}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load available times");
      }
      return response.json();
    },
  });

  const rescheduleDate = rescheduleForm.watch("date");

  const { data: rescheduleSlots, isLoading: isLoadingRescheduleSlots } = useQuery<string[]>({
    queryKey: ["/api/available-slots", "reschedule", rescheduleDate],
    enabled: action === "appointments-today" && Boolean(rescheduleTarget) && Boolean(rescheduleDate),
    queryFn: async () => {
      const response = await fetch(`/api/available-slots/${rescheduleDate}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to load available times");
      }
      return response.json();
    },
  });

  const { data: todayAppointmentsData, isLoading: isLoadingToday } = useQuery<TodayAppointment[]>({
    queryKey: ["/api/appointments/today"],
    enabled: action === "appointments-today",
  });

  const todayAppointments = todayAppointmentsData ?? [];

  const formatTime = (time: string) => {
    const [hoursStr, minutes] = time.split(":");
    const hours = Number(hoursStr);
    if (Number.isNaN(hours)) return time;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${period}`;
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
    scheduled: { label: "Scheduled", variant: "secondary" },
    confirmed: { label: "Confirmed", variant: "default" },
    in_chair: { label: "In Chair", variant: "default" },
    completed: { label: "Completed", variant: "outline" },
    cancelled: { label: "Cancelled", variant: "destructive" },
    no_show: { label: "No Show", variant: "destructive" },
  };

  const openReschedule = (appointment: TodayAppointment) => {
    setRescheduleTarget(appointment.id);
    rescheduleForm.reset({
      appointmentId: appointment.id,
      date: appointment.date,
      startTime: appointment.startTime,
      notes: appointment.notes ?? "",
    });
  };

  const rescheduleSlotOptions = (appointment: TodayAppointment) => {
    if (!rescheduleSlots) return [] as string[];
    if (rescheduleForm.watch("date") === appointment.date && !rescheduleSlots.includes(appointment.startTime)) {
      return [appointment.startTime, ...rescheduleSlots];
    }
    return rescheduleSlots;
  };


  const bookAppointmentMutation = useMutation({
    mutationFn: async (values: BookAppointmentFormValues) => {
      const payload = {
        clientId: values.clientId,
        serviceId: Number(values.serviceId),
        date: values.date,
        startTime: values.startTime,
        notes: values.notes ? values.notes.trim() : undefined,
        automationOptOut: !values.applyAutomations,
      };
      const response = await apiRequest("POST", "/api/appointments", payload);
      return response.json();
    },
    onSuccess: (_, values) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots", selectedDate] });

      toast({
        title: "Appointment booked",
        description: values.applyAutomations
          ? "Automations will run for this appointment."
          : "Automations are off for this appointment.",
      });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Unable to book appointment",
        description: error?.message ?? "Please verify the details and try again.",
        variant: "destructive",
      });
    },
  });

  const statusMessages: Record<string, { title: string; description?: string }> = {
    confirmed: { title: "Appointment confirmed" },
    in_chair: { title: "Client marked in chair" },
    completed: { title: "Appointment completed", description: "Follow-ups will run automatically." },
    cancelled: { title: "Appointment cancelled" },
    no_show: { title: "Marked as no-show" },
    scheduled: { title: "Status updated" },
  };

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, note }: { id: string; status: string; note?: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}/status`, { status, note });
      return response.json();
    },
    onMutate: ({ id }) => {
      setPendingActionId(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      const message = statusMessages[variables.status] ?? { title: "Status updated" };
      toast({ title: message.title, description: message.description });

      if (variables.status === "cancelled") {
        setCancelDialog({ id: null, note: "" });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Unable to update status",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingActionId(null);
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async ({ id, date, startTime, notes }: { id: string; date: string; startTime: string; notes?: string }) => {
      const response = await apiRequest("PATCH", `/api/appointments/${id}/reschedule`, {
        date,
        startTime,
        notes,
      });
      return response.json();
    },
    onMutate: ({ id }) => {
      setPendingActionId(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/appointments/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/available-slots", "reschedule", variables.date] });
      toast({
        title: "Appointment rescheduled",
        description: `Moved to ${variables.date} at ${variables.startTime}`,
      });
      setRescheduleTarget(null);
      rescheduleForm.reset({
        appointmentId: "",
        date: "",
        startTime: "",
        notes: "",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Unable to reschedule",
        description: error?.message ?? "Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setPendingActionId(null);
    },
  });

  const clients = clientsResponse?.items ?? [];
  const services = servicesResponse?.items ?? [];

  if (!action) {
    return null;
  }

  const renderActionButtons = (appointment: TodayAppointment, isBusy: boolean) => {
    const buttons: JSX.Element[] = [];
    const closedStates = new Set(["completed", "cancelled", "no_show"]);
    const isRescheduling = rescheduleTarget === appointment.id;

    if (!closedStates.has(appointment.status)) {
      if (appointment.status === "scheduled") {
        buttons.push(
          <Button
            key="confirm"
            size="sm"
            disabled={isBusy}
            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "confirmed" })}
          >
            Confirm
          </Button>
        );
      }

      if (["scheduled", "confirmed"].includes(appointment.status)) {
        buttons.push(
          <Button
            key="reschedule"
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => {
              if (isRescheduling) {
                closeReschedule();
              } else {
                openReschedule(appointment);
              }
            }}
          >
            {isRescheduling ? "Close Reschedule" : "Reschedule"}
          </Button>
        );
      }

      if (["scheduled", "confirmed", "in_chair"].includes(appointment.status)) {
        buttons.push(
          <Button
            key="cancel"
            size="sm"
            variant="destructive"
            disabled={isBusy}
            onClick={() => setCancelDialog({ id: appointment.id, note: "" })}
          >
            Cancel
          </Button>
        );
      }

      if (appointment.status === "confirmed") {
        buttons.push(
          <Button
            key="in-chair"
            size="sm"
            disabled={isBusy}
            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "in_chair" })}
          >
            In Chair
          </Button>
        );
      }

      if (appointment.status === "in_chair") {
        buttons.push(
          <Button
            key="complete"
            size="sm"
            disabled={isBusy}
            onClick={() => updateStatusMutation.mutate({ id: appointment.id, status: "completed" })}
          >
            Complete
          </Button>
        );
      }
    }

    if (buttons.length === 0) {
      return null;
    }

    return <div className="flex flex-wrap gap-2">{buttons}</div>;
  };

  const renderRescheduleForm = (appointment: TodayAppointment, isBusy: boolean) => {
    if (rescheduleTarget !== appointment.id) {
      return null;
    }

    const slotOptionsRaw = rescheduleSlotOptions(appointment);
    const slotOptions = Array.from(
      new Set(slotOptionsRaw.length ? slotOptionsRaw : ([rescheduleForm.watch("startTime")] as string[]).filter(Boolean))
    );

    return (
      <Form {...rescheduleForm}>
        <form
          className="space-y-3 rounded-md border bg-muted/30 p-3"
          onSubmit={rescheduleForm.handleSubmit((values) =>
            rescheduleMutation.mutate({
              id: appointment.id,
              date: values.date,
              startTime: values.startTime,
              notes: values.notes ? values.notes.trim() : undefined,
            })
          )}
        >
          <div className="grid gap-3 md:grid-cols-2">
            <FormField
              control={rescheduleForm.control}
              name="date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" disabled={isBusy} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={rescheduleForm.control}
              name="startTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Time</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isBusy || !rescheduleForm.watch("date") || isLoadingRescheduleSlots}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={isLoadingRescheduleSlots ? "Loading times..." : "Select a time"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {slotOptions.map((slot) => (
                        <SelectItem key={slot} value={slot}>
                          {formatTime(slot)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={rescheduleForm.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes (optional)</FormLabel>
                <FormControl>
                  <Textarea
                    rows={3}
                    disabled={isBusy}
                    placeholder="Add context for the client"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" size="sm" disabled={isBusy} onClick={closeReschedule}>
              Close
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={
                isBusy ||
                !rescheduleForm.watch("date") ||
                !rescheduleForm.watch("startTime") ||
                rescheduleMutation.isPending
              }
            >
              Save
            </Button>
          </div>
        </form>
      </Form>
    );
  };

  const renderTodayAppointments = () => {
    if (isLoadingToday) {
      return (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (todayAppointments.length === 0) {
      return <p className="text-sm text-muted-foreground">No appointments scheduled for today yet.</p>;
    }

    return (
      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-4">
          {todayAppointments.map((appointment) => {
            const statusInfo = statusConfig[appointment.status] ?? statusConfig.scheduled;
            const isBusy =
              pendingActionId === appointment.id && (updateStatusMutation.isPending || rescheduleMutation.isPending);
            const clientLabel =
              appointment.client.name && appointment.client.name.trim().length > 0
                ? appointment.client.name
                : `${appointment.client.firstName} ${appointment.client.lastName}`.trim();

            return (
              <div key={appointment.id} className="space-y-3 rounded-md border p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {formatTime(appointment.startTime)} · {appointment.service.serviceName}
                    </p>
                    <p className="text-sm text-muted-foreground">{clientLabel}</p>
                    {appointment.notes ? (
                      <p className="mt-1 text-xs text-muted-foreground">{appointment.notes}</p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-2">
                    {isBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Badge variant={statusInfo?.variant ?? "secondary"}>{statusInfo?.label ?? appointment.status}</Badge>
                  </div>
                </div>
                {renderActionButtons(appointment, isBusy)}
                {renderRescheduleForm(appointment, isBusy)}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    );
  };

  const renderCancelDialog = () => (
    <AlertDialog
      open={Boolean(cancelDialog.id)}
      onOpenChange={(open) => {
        if (!open) {
          setCancelDialog({ id: null, note: "" });
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel appointment</AlertDialogTitle>
          <AlertDialogDescription>
            Optionally leave a note so you remember why this booking was cancelled.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Textarea
          className="mt-2"
          rows={3}
          placeholder="Optional reason"
          value={cancelDialog.note}
          onChange={(event) => setCancelDialog((prev) => ({ ...prev, note: event.target.value }))}
        />
        <AlertDialogFooter>
          <AlertDialogCancel disabled={updateStatusMutation.isPending}>Close</AlertDialogCancel>
          <AlertDialogAction
            disabled={!cancelDialog.id || updateStatusMutation.isPending}
            onClick={() => {
              if (cancelDialog.id) {
                updateStatusMutation.mutate({
                  id: cancelDialog.id,
                  status: "cancelled",
                  note: cancelDialog.note || undefined,
                });
              }
            }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {updateStatusMutation.isPending ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Cancelling...
              </span>
            ) : (
              "Cancel appointment"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  const renderAddClientForm = () => (
    <Form {...addClientForm}>
      <form
        className="space-y-4"
        onSubmit={addClientForm.handleSubmit((values) => mutation.mutate(values))}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={addClientForm.control}
            name="firstName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First name</FormLabel>
                <FormControl>
                  <Input placeholder="Jamie" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={addClientForm.control}
            name="lastName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last name</FormLabel>
                <FormControl>
                  <Input placeholder="Rivera" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={addClientForm.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input placeholder="(555) 123-4567" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={addClientForm.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email (optional)</FormLabel>
                <FormControl>
                  <Input type="email" placeholder="jamie@example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={addClientForm.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Appointment preferences, color notes, etc."
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={addClientForm.control}
          name="optInMarketing"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
              <FormLabel className="font-normal">Opt into marketing updates</FormLabel>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? "Saving..." : "Save client"}
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderBookAppointmentForm = () => (
    <Form {...bookAppointmentForm}>
      <form
        className="space-y-4"
        onSubmit={bookAppointmentForm.handleSubmit((values) => bookAppointmentMutation.mutate(values))}
      >
        <FormField
          control={bookAppointmentForm.control}
          name="clientId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Client</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {clients.length === 0 && <SelectItem value="__no-clients" disabled>No clients found</SelectItem>}
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={bookAppointmentForm.control}
          name="serviceId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Service</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a service" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {services.length === 0 && <SelectItem value="__no-services" disabled>No services found</SelectItem>}
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.serviceName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={bookAppointmentForm.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={bookAppointmentForm.control}
            name="startTime"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Time</FormLabel>
                <Select value={field.value} onValueChange={field.onChange} disabled={!selectedDate || isLoadingSlots}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={isLoadingSlots ? "Loading times..." : "Select a time"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {!selectedDate && <SelectItem value="__pick-date" disabled>Select a date first</SelectItem>}
                    {selectedDate && !availableSlots?.length && !isLoadingSlots && (
                      <SelectItem value="__no-availability" disabled>No availability</SelectItem>
                    )}
                    {availableSlots?.map((slot) => (
                      <SelectItem key={slot} value={slot}>
                        {formatTime(slot)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={bookAppointmentForm.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes (optional)</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Add booking notes" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={bookAppointmentForm.control}
          name="applyAutomations"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between space-y-0 border rounded-md p-3">
              <div>
                <FormLabel className="text-sm">Apply automations</FormLabel>
                <p className="text-xs text-muted-foreground">
                  When on, reminders and follow-ups will run for this appointment.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={bookAppointmentMutation.isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={bookAppointmentMutation.isPending}>
            {bookAppointmentMutation.isPending ? "Booking..." : "Book appointment"}
          </Button>
        </div>
      </form>
    </Form>
  );

  const renderContent = () => {
    switch (action) {
      case "add-client":
        return renderAddClientForm();
      case "book-appointment":
        return renderBookAppointmentForm();
      case "appointments-today":
        return renderTodayAppointments();
      default:
        return null;
    }
  };

  const titleMap: Record<QuickActionFormType, string> = {
    "add-client": "Add Client",
    "book-appointment": "Book Appointment",
    "appointments-today": "Today\'s Appointments",
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{titleMap[action]}</DialogTitle>
          </DialogHeader>
          {renderContent()}
        </DialogContent>
      </Dialog>
      {renderCancelDialog()}
    </>
  );
}
