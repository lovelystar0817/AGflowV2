import assert from "node:assert/strict";
import { executeBookAppointment, executeRescheduleAppointment } from "../ai-handlers";
import { storage } from "../storage-instance";

type StorageKey = keyof typeof storage;

type StorageOverrides = Partial<Record<StorageKey, any>>;

function mockStorage(overrides: StorageOverrides) {
  const originals = new Map<StorageKey, any>();

  for (const key of Object.keys(overrides) as StorageKey[]) {
    originals.set(key, (storage as any)[key]);
    (storage as any)[key] = overrides[key];
  }

  return () => {
    for (const [key, value] of originals.entries()) {
      (storage as any)[key] = value;
    }
  };
}

interface TestCase {
  name: string;
  fn: () => Promise<void> | void;
}

const tests: TestCase[] = [];

function test(name: string, fn: () => Promise<void> | void) {
  tests.push({ name, fn });
}

const baseMocks: StorageOverrides = {
  checkAiExecutionExists: async () => false,
  insertAiExecution: async () => ({}),
};

test("executeBookAppointment rejects conflicting time slots", async () => {
  const restore = mockStorage({
    ...baseMocks,
    getClientsByStylist: async () => [
      { id: "client-1", stylistId: "stylist-1", firstName: "Alice", lastName: "Doe" } as any,
    ],
    getStylistServices: async () => [
      { id: 1, stylistId: "stylist-1", serviceName: "Haircut", durationMinutes: 60, price: "45" } as any,
    ],
    getStylist: async () => ({
      id: "stylist-1",
      businessHours: { monday: { open: "09:00", close: "17:00" } },
      defaultAppointmentDuration: 30,
    }) as any,
    getAppointmentsByStylist: async () => [
      { id: "appt-2", stylistId: "stylist-1", date: "2024-12-30", startTime: "10:00", endTime: "11:00" } as any,
    ],
    getStylistAvailability: async () => ({
      stylistId: "stylist-1",
      date: "2024-12-30",
      isOpen: true,
      timeRanges: [{ start: "09:00", end: "17:00" }],
    }) as any,
    createAppointment: async () => {
      throw new Error("should not create appointment when conflict exists");
    },
  });

  try {
    const result = await executeBookAppointment("stylist-1", {
      clientName: "Alice Doe",
      serviceName: "Haircut",
      date: "2024-12-30",
      time: "10:00",
    });

    assert.equal(result.success, false);
    assert.match(result.message, /already booked/i);
  } finally {
    restore();
  }
});

test("executeBookAppointment rejects after-hours attempts", async () => {
  const restore = mockStorage({
    ...baseMocks,
    getClientsByStylist: async () => [
      { id: "client-1", stylistId: "stylist-1", firstName: "Alice", lastName: "Doe" } as any,
    ],
    getStylistServices: async () => [
      { id: 1, stylistId: "stylist-1", serviceName: "Haircut", durationMinutes: 45, price: "45" } as any,
    ],
    getStylist: async () => ({
      id: "stylist-1",
      businessHours: { monday: { open: "09:00", close: "17:00" } },
      defaultAppointmentDuration: 30,
    }) as any,
    getAppointmentsByStylist: async () => [],
    getStylistAvailability: async () => ({
      stylistId: "stylist-1",
      date: "2024-12-30",
      isOpen: true,
      timeRanges: [{ start: "00:00", end: "23:59" }],
    }) as any,
    createAppointment: async () => {
      throw new Error("should not create appointment outside business hours");
    },
  });

  try {
    const result = await executeBookAppointment("stylist-1", {
      clientName: "Alice Doe",
      serviceName: "Haircut",
      date: "2024-12-30",
      time: "20:00",
    });

    assert.equal(result.success, false);
    assert.match(result.message, /outside business hours/i);
  } finally {
    restore();
  }
});

test("executeRescheduleAppointment respects conflicts", async () => {
  const restore = mockStorage({
    ...baseMocks,
    getAppointment: async () => ({
      id: "appt-1",
      stylistId: "stylist-1",
      date: "2024-12-30",
      startTime: "09:00",
      endTime: "10:00",
      clientId: "client-1",
      serviceId: 1,
      status: "confirmed",
      totalPrice: "45",
    }) as any,
    getStylist: async () => ({
      id: "stylist-1",
      businessHours: { monday: { open: "09:00", close: "17:00" } },
      defaultAppointmentDuration: 30,
    }) as any,
    getAppointmentsByStylist: async () => [
      { id: "appt-1", stylistId: "stylist-1", date: "2024-12-30", startTime: "09:00", endTime: "10:00" } as any,
      { id: "appt-2", stylistId: "stylist-1", date: "2024-12-30", startTime: "10:00", endTime: "11:00" } as any,
    ],
    getStylistAvailability: async () => ({
      stylistId: "stylist-1",
      date: "2024-12-30",
      isOpen: true,
      timeRanges: [{ start: "09:00", end: "17:00" }],
    }) as any,
    updateAppointment: async () => {
      throw new Error("should not update appointment when conflict exists");
    },
  });

  try {
    const result = await executeRescheduleAppointment("stylist-1", {
      appointmentId: "appt-1",
      date: "2024-12-30",
      time: "10:00",
    });

    assert.equal(result.success, false);
    assert.match(result.message, /already booked/i);
  } finally {
    restore();
  }
});

(async () => {
  let hasFailures = false;

  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`\u2713 ${name}`);
    } catch (error) {
      hasFailures = true;
      console.error(`\u2717 ${name}`);
      console.error(error);
    }
  }

  if (hasFailures) {
    process.exitCode = 1;
  }
})();
