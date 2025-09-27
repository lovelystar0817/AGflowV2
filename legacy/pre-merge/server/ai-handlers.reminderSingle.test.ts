import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mock } from 'node:test';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgres://user:password@localhost:5432/test-db';
}
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = 'test-resend-api-key';
}
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = 'test-openai-api-key';
}

const { executeReminderSingle } = await import('./ai-handlers');
const { storage } = await import('./storage-instance');

test('executeReminderSingle does not schedule reminders for opted-out clients', async (t) => {
  t.after(() => mock.restoreAll());

  const stylistId = 'stylist-123';
  const args = { clientName: 'Jane Doe', when: '2025-01-01T10:00:00.000Z' };
  const client = {
    id: 'client-1',
    firstName: 'Jane',
    lastName: 'Doe',
    optInMarketing: false
  } as any;

  mock.method(storage, 'checkAiExecutionExists', async () => false);
  mock.method(storage, 'insertAiExecution', async () => ({} as any));
  mock.method(storage, 'getClientsByStylist', async () => [client]);
  const getClientMock = mock.method(storage, 'getClient', async () => client);
  const createNotificationMock = mock.method(storage, 'createNotification', async () => ({} as any));

  const result = await executeReminderSingle(stylistId, args);

  assert.equal(result.success, false);
  assert.match(result.message, /opted out/i);
  assert.equal(createNotificationMock.mock.callCount(), 0);
  assert.equal(getClientMock.mock.callCount(), 1);
});

test('executeReminderSingle schedules reminders for opted-in clients', async (t) => {
  t.after(() => mock.restoreAll());

  const stylistId = 'stylist-456';
  const args = { clientName: 'John Smith', when: '2025-01-02T09:00:00.000Z' };
  const client = {
    id: 'client-2',
    firstName: 'John',
    lastName: 'Smith',
    optInMarketing: true
  } as any;

  const notification = {
    id: 'notification-1',
    stylistId,
    clientId: client.id,
    subject: 'Reminder',
    message: 'Reminder body',
    scheduledAt: new Date(args.when)
  } as any;

  mock.method(storage, 'checkAiExecutionExists', async () => false);
  mock.method(storage, 'insertAiExecution', async () => ({} as any));
  mock.method(storage, 'getClientsByStylist', async () => [client]);
  mock.method(storage, 'getClient', async () => client);
  const createNotificationMock = mock.method(storage, 'createNotification', async () => notification);

  const result = await executeReminderSingle(stylistId, args);

  assert.equal(result.success, true);
  assert.equal(createNotificationMock.mock.callCount(), 1);
  assert.equal(result.entity, notification);
  assert.match(result.message, /Successfully scheduled email reminder/i);

  const [payload] = createNotificationMock.mock.calls[0].arguments;
  assert.equal(payload.clientId, client.id);
  assert.equal(payload.stylistId, stylistId);
});
