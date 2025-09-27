import assert from 'node:assert/strict';
import test from 'node:test';
import type { VisitCandidateRow, InactiveCandidateRow } from '../server/promotion-automation';

process.env.DATABASE_URL ??= 'postgres://user:pass@localhost:5432/test';
process.env.RESEND_API_KEY ??= 'test-key';
process.env.OPENAI_API_KEY ??= 'test-key';

const automationModulePromise = import('../server/promotion-automation');

test('determineVisitRecipients filters eligible clients correctly', async () => {
  const { determineVisitRecipients, buildExecutionKey } = await automationModulePromise;
  const rows: VisitCandidateRow[] = [
    {
      clientId: 'client-1',
      visitCount: 5,
      email: 'one@example.com',
      firstName: 'Alice',
      lastName: 'Anderson',
      optInMarketing: true,
    },
    {
      clientId: 'client-2',
      visitCount: 2,
      email: 'two@example.com',
      firstName: 'Bob',
      lastName: 'Brown',
      optInMarketing: true,
    },
    {
      clientId: 'client-3',
      visitCount: 6,
      email: null,
      firstName: 'Cara',
      lastName: 'Cole',
      optInMarketing: true,
    },
    {
      clientId: 'client-4',
      visitCount: 7,
      email: 'four@example.com',
      firstName: 'Dan',
      lastName: 'Dunn',
      optInMarketing: false,
    },
    {
      clientId: 'client-5',
      visitCount: 8,
      email: 'five@example.com',
      firstName: 'Eve',
      lastName: 'Evans',
      optInMarketing: true,
    },
  ];

  const existing = new Set<string>([buildExecutionKey('rule-1', 'coupon-1', 'client-5')]);
  const result = determineVisitRecipients(rows, 3, existing, 'rule-1', 'coupon-1');

  assert.equal(result.length, 1);
  assert.equal(result[0]?.clientId, 'client-1');
});

test('determineInactiveRecipients filters by last visit date and opt-in', async () => {
  const { determineInactiveRecipients, buildExecutionKey } = await automationModulePromise;
  const reference = new Date('2024-05-01T00:00:00Z');
  const rows: InactiveCandidateRow[] = [
    {
      clientId: 'client-1',
      lastVisit: '2024-01-01',
      email: 'one@example.com',
      firstName: 'Alice',
      lastName: 'Anderson',
      optInMarketing: true,
    },
    {
      clientId: 'client-2',
      lastVisit: '2024-04-10',
      email: 'two@example.com',
      firstName: 'Bob',
      lastName: 'Brown',
      optInMarketing: true,
    },
    {
      clientId: 'client-3',
      lastVisit: null,
      email: 'three@example.com',
      firstName: 'Cara',
      lastName: 'Cole',
      optInMarketing: true,
    },
    {
      clientId: 'client-4',
      lastVisit: 'invalid-date',
      email: 'four@example.com',
      firstName: 'Dan',
      lastName: 'Dunn',
      optInMarketing: true,
    },
    {
      clientId: 'client-5',
      lastVisit: '2023-11-01',
      email: 'five@example.com',
      firstName: 'Eve',
      lastName: 'Evans',
      optInMarketing: true,
    },
  ];

  const existing = new Set<string>([buildExecutionKey('rule-2', 'coupon-2', 'client-5')]);
  const result = determineInactiveRecipients(rows, 8, existing, 'rule-2', 'coupon-2', reference);

  assert.equal(result.length, 1);
  assert.equal(result[0]?.clientId, 'client-1');
});

test('formatBusinessName prefers configured name then stylist name', async () => {
  const { formatBusinessName } = await automationModulePromise;
  assert.equal(
    formatBusinessName({
      businessName: 'Salon Luxe',
      firstName: 'Avery',
      lastName: 'Styles',
      email: 'avery@example.com',
    }),
    'Salon Luxe',
  );

  assert.equal(
    formatBusinessName({
      businessName: null,
      firstName: 'Taylor',
      lastName: 'Trim',
      email: 'taylor@example.com',
    }),
    'Taylor Trim',
  );

  assert.equal(
    formatBusinessName({
      businessName: '',
      firstName: null,
      lastName: null,
      email: 'morgan@example.com',
    }),
    'morgan',
  );
});
