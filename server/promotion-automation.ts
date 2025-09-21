import { and, eq, inArray, sql } from 'drizzle-orm';
import {
  promotionRules,
  coupons,
  clients,
  clientVisits,
  aiExecutions,
  couponDeliveries,
  stylists,
  type PromotionRule,
} from '@shared/schema';
import { db } from './db';
import { getResendEmailService } from './resend-email-service';

export type PromotionTrigger = 'after_n_visits' | 'inactive_n_weeks';

export interface PromotionRuleSummary {
  ruleId: string;
  trigger: PromotionTrigger;
  attempted: number;
  sent: number;
  failed: number;
  skipped: number;
  status: 'success' | 'partial' | 'no-recipients' | 'error';
  error?: string;
}

interface PromotionRuleRow {
  id: string;
  stylistId: string;
  trigger: string;
  condition: PromotionRule['condition'];
  rewardCouponId: string;
  coupon: {
    id: string;
    name: string;
    type: string;
    amount: string;
    startDate: string;
    endDate: string;
  };
  stylist: {
    businessName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
}

export interface VisitCandidateRow {
  clientId: string;
  visitCount: number;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  optInMarketing: boolean;
}

export interface InactiveCandidateRow {
  clientId: string;
  lastVisit: string | null;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  optInMarketing: boolean;
}

export function buildExecutionKey(ruleId: string, couponId: string, clientId: string): string {
  return `promotion:${ruleId}:${couponId}:${clientId}`;
}

export function formatBusinessName(stylist: PromotionRuleRow['stylist']): string {
  if (stylist.businessName && stylist.businessName.trim()) {
    return stylist.businessName.trim();
  }
  const parts = [stylist.firstName, stylist.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(' ');
  }
  return stylist.email.split('@')[0] ?? 'Your Stylist';
}

export function determineVisitRecipients(
  rows: VisitCandidateRow[],
  minVisits: number,
  existingKeys: Set<string>,
  ruleId: string,
  couponId: string,
): VisitCandidateRow[] {
  return rows.filter((row) => {
    if (!row.email || !row.email.trim()) {
      return false;
    }
    if (!row.optInMarketing) {
      return false;
    }
    if (row.visitCount < minVisits) {
      return false;
    }
    const key = buildExecutionKey(ruleId, couponId, row.clientId);
    return !existingKeys.has(key);
  });
}

export function determineInactiveRecipients(
  rows: InactiveCandidateRow[],
  weeks: number,
  existingKeys: Set<string>,
  ruleId: string,
  couponId: string,
  referenceDate: Date = new Date(),
): InactiveCandidateRow[] {
  const cutoff = new Date(referenceDate);
  cutoff.setDate(cutoff.getDate() - weeks * 7);

  return rows.filter((row) => {
    if (!row.email || !row.email.trim()) {
      return false;
    }
    if (!row.optInMarketing) {
      return false;
    }
    if (!row.lastVisit) {
      return false;
    }
    const lastVisitDate = new Date(row.lastVisit);
    if (Number.isNaN(lastVisitDate.getTime())) {
      return false;
    }
    if (lastVisitDate >= cutoff) {
      return false;
    }
    const key = buildExecutionKey(ruleId, couponId, row.clientId);
    return !existingKeys.has(key);
  });
}

export async function processPromotionRules(now: Date = new Date()): Promise<PromotionRuleSummary[]> {
  const emailService = getResendEmailService();

  const rules = await db
    .select({
      id: promotionRules.id,
      stylistId: promotionRules.stylistId,
      trigger: promotionRules.trigger,
      condition: promotionRules.condition,
      rewardCouponId: promotionRules.rewardCouponId,
      coupon: {
        id: coupons.id,
        name: coupons.name,
        type: coupons.type,
        amount: coupons.amount,
        startDate: coupons.startDate,
        endDate: coupons.endDate,
      },
      stylist: {
        businessName: stylists.businessName,
        firstName: stylists.firstName,
        lastName: stylists.lastName,
        email: stylists.email,
      },
    })
    .from(promotionRules)
    .innerJoin(coupons, eq(promotionRules.rewardCouponId, coupons.id))
    .innerJoin(stylists, eq(promotionRules.stylistId, stylists.id))
    .where(eq(promotionRules.active, true));

  const summaries: PromotionRuleSummary[] = [];

  for (const rule of rules) {
    if (!isPromotionTrigger(rule.trigger)) {
      summaries.push({
        ruleId: rule.id,
        trigger: 'after_n_visits',
        attempted: 0,
        sent: 0,
        failed: 0,
        skipped: 0,
        status: 'error',
        error: `Unsupported trigger ${rule.trigger}`,
      });
      continue;
    }

    const trigger: PromotionTrigger = rule.trigger;

    const summary: PromotionRuleSummary = {
      ruleId: rule.id,
      trigger,
      attempted: 0,
      sent: 0,
      failed: 0,
      skipped: 0,
      status: 'no-recipients',
    };

    try {
      const today = now.toISOString().split('T')[0];
      const couponActive = rule.coupon.startDate <= today && rule.coupon.endDate >= today;
      if (!couponActive) {
        summary.status = 'error';
        summary.error = `Coupon ${rule.coupon.id} is not active.`;
        summaries.push(summary);
        continue;
      }

      const businessName = formatBusinessName(rule.stylist);
      const discountDescription = buildDiscountDescription(rule.coupon);
      const subject = buildEmailSubject(trigger, businessName);
      const baseMessage = buildEmailMessage(trigger, businessName, discountDescription, rule.condition);

      if (trigger === 'after_n_visits') {
        const minVisits = Number(rule.condition?.count ?? 0);
        if (!Number.isFinite(minVisits) || minVisits <= 0) {
          throw new Error(`Invalid visit count condition for rule ${rule.id}`);
        }

        const visitRows = await fetchVisitCandidates(rule.stylistId);
        const existing = await fetchExistingKeys(rule.stylistId, visitRows.map((row) => buildExecutionKey(rule.id, rule.coupon.id, row.clientId)));
        const recipients = determineVisitRecipients(visitRows, minVisits, existing, rule.id, rule.coupon.id);
        const result = await sendCouponToRecipients({
          stylistId: rule.stylistId,
          coupon: rule.coupon,
          recipients,
          subject,
          baseMessage,
          emailService,
          ruleId: rule.id,
          trigger,
          businessName,
        });
        await logCouponDelivery(rule, recipients, result, baseMessage, now, trigger, subject);
        console.log(
          `Processed promotion rule ${rule.id} (${trigger}) - Sent: ${result.sent}/${result.attempted}, Failed: ${result.failed}, Status: ${result.status}`
        );
        summaries.push({ ...summary, ...result });
        continue;
      }

      if (trigger === 'inactive_n_weeks') {
        const weeks = Number(rule.condition?.weeks ?? 0);
        if (!Number.isFinite(weeks) || weeks <= 0) {
          throw new Error(`Invalid weeks condition for rule ${rule.id}`);
        }

        const inactiveRows = await fetchInactiveCandidates(rule.stylistId);
        const keys = inactiveRows.map((row) => buildExecutionKey(rule.id, rule.coupon.id, row.clientId));
        const existing = await fetchExistingKeys(rule.stylistId, keys);
        const recipients = determineInactiveRecipients(inactiveRows, weeks, existing, rule.id, rule.coupon.id, now);
        const result = await sendCouponToRecipients({
          stylistId: rule.stylistId,
          coupon: rule.coupon,
          recipients,
          subject,
          baseMessage,
          emailService,
          ruleId: rule.id,
          trigger,
          businessName,
        });
        await logCouponDelivery(rule, recipients, result, baseMessage, now, trigger, subject);
        console.log(
          `Processed promotion rule ${rule.id} (${trigger}) - Sent: ${result.sent}/${result.attempted}, Failed: ${result.failed}, Status: ${result.status}`
        );
        summaries.push({ ...summary, ...result });
        continue;
      }

      summary.status = 'error';
      summary.error = `Unsupported trigger ${rule.trigger}`;
      summaries.push(summary);
    } catch (error: any) {
      summary.status = 'error';
      summary.error = error?.message ?? 'Unknown error';
      summaries.push(summary);
      console.error(`Failed to process promotion rule ${rule.id}:`, error);
    }
  }

  return summaries;
}

function isPromotionTrigger(value: string): value is PromotionTrigger {
  return value === 'after_n_visits' || value === 'inactive_n_weeks';
}

function buildDiscountDescription(coupon: PromotionRuleRow['coupon']): string {
  const amount = Number(coupon.amount);
  if (coupon.type === 'percent') {
    return `${Number.isFinite(amount) ? amount : coupon.amount}% off your next visit`;
  }
  const formatted = Number.isFinite(amount) ? amount.toFixed(2) : coupon.amount;
  return `$${formatted} off your next visit`;
}

function buildEmailSubject(trigger: PromotionTrigger, businessName: string): string {
  switch (trigger) {
    case 'after_n_visits':
      return `${businessName}: Thanks for being a loyal client!`;
    case 'inactive_n_weeks':
      return `${businessName} misses you - enjoy a special offer!`;
    default:
      return `${businessName} has a special offer for you`;
  }
}

function buildEmailMessage(
  trigger: PromotionTrigger,
  businessName: string,
  discountDescription: string,
  condition: PromotionRule['condition'],
): string {
  switch (trigger) {
    case 'after_n_visits':
      return `Thank you for your loyalty! After ${condition?.count ?? ''} visits, enjoy ${discountDescription}.`;
    case 'inactive_n_weeks':
      return `It's been a while since we saw you at ${businessName}. Come back and enjoy ${discountDescription}.`;
    default:
      return `Enjoy ${discountDescription} from ${businessName}.`;
  }
}

async function fetchVisitCandidates(stylistId: string): Promise<VisitCandidateRow[]> {
  const rows = await db
    .select({
      clientId: clientVisits.clientId,
      visitCount: sql<number>`count(${clientVisits.id})`,
      email: clients.email,
      firstName: clients.firstName,
      lastName: clients.lastName,
      optInMarketing: clients.optInMarketing,
    })
    .from(clientVisits)
    .innerJoin(clients, and(eq(clientVisits.clientId, clients.id), eq(clients.stylistId, stylistId)))
    .where(eq(clientVisits.stylistId, stylistId))
    .groupBy(
      clientVisits.clientId,
      clients.email,
      clients.firstName,
      clients.lastName,
      clients.optInMarketing,
    );

  return rows.map((row) => ({
    ...row,
    visitCount: Number(row.visitCount ?? 0),
    optInMarketing: Boolean(row.optInMarketing),
  }));
}

async function fetchInactiveCandidates(stylistId: string): Promise<InactiveCandidateRow[]> {
  const rows = await db
    .select({
      clientId: clients.id,
      lastVisit: sql<string | null>`max(${clientVisits.visitDate})`,
      email: clients.email,
      firstName: clients.firstName,
      lastName: clients.lastName,
      optInMarketing: clients.optInMarketing,
    })
    .from(clients)
    .leftJoin(clientVisits, and(eq(clientVisits.clientId, clients.id), eq(clientVisits.stylistId, stylistId)))
    .where(eq(clients.stylistId, stylistId))
    .groupBy(clients.id, clients.email, clients.firstName, clients.lastName, clients.optInMarketing);

  return rows.map((row) => ({
    ...row,
    optInMarketing: Boolean(row.optInMarketing),
  }));
}

async function fetchExistingKeys(stylistId: string, keys: string[]): Promise<Set<string>> {
  if (keys.length === 0) {
    return new Set();
  }

  const uniqueKeys = Array.from(new Set(keys));

  const existing = await db
    .select({ key: aiExecutions.key })
    .from(aiExecutions)
    .where(and(eq(aiExecutions.stylistId, stylistId), inArray(aiExecutions.key, uniqueKeys)));

  return new Set(existing.map((row) => row.key));
}

interface SendRecipientsOptions {
  stylistId: string;
  coupon: PromotionRuleRow['coupon'];
  recipients: (VisitCandidateRow | InactiveCandidateRow)[];
  subject: string;
  baseMessage: string;
  emailService: ReturnType<typeof getResendEmailService>;
  ruleId: string;
  trigger: PromotionTrigger;
  businessName: string;
}

interface SendResult extends PromotionRuleSummary {}

async function sendCouponToRecipients(options: SendRecipientsOptions): Promise<SendResult> {
  const {
    stylistId,
    coupon,
    recipients,
    subject,
    baseMessage,
    emailService,
    ruleId,
    trigger,
    businessName,
  } = options;

  const result: SendResult = {
    ruleId,
    trigger,
    attempted: recipients.length,
    sent: 0,
    failed: 0,
    skipped: 0,
    status: 'no-recipients',
    error: undefined,
  } as SendResult;

  if (recipients.length === 0) {
    return result;
  }

  result.status = 'success';
  const errors: string[] = [];

  for (const recipient of recipients) {
    const executionKey = buildExecutionKey(ruleId, coupon.id, recipient.clientId);
    const personalizedMessage = personalizeMessage(baseMessage, recipient);

    try {
      const sendResult = await emailService.sendCouponEmail(
        recipient.email!,
        subject,
        coupon.name,
        personalizedMessage,
        new Date(coupon.endDate),
        businessName,
      );

      if (sendResult.success) {
        result.sent += 1;
        await db
          .insert(aiExecutions)
          .values({ stylistId, key: executionKey })
          .onConflictDoNothing();
      } else {
        result.failed += 1;
        result.status = result.sent > 0 ? 'partial' : 'error';
        if (sendResult.error) {
          errors.push(sendResult.error);
        }
      }
    } catch (error) {
      result.failed += 1;
      result.status = result.sent > 0 ? 'partial' : 'error';
      console.error(`Failed to send coupon to client ${recipient.clientId}:`, error);
      if (error instanceof Error && error.message) {
        errors.push(error.message);
      }
    }
  }

  if (result.sent === 0 && result.failed === 0) {
    result.status = 'no-recipients';
  } else if (result.sent === 0 && result.failed > 0) {
    result.status = 'error';
  } else if (result.failed > 0) {
    result.status = 'partial';
  }

  if (errors.length > 0) {
    result.error = errors.join('; ');
  }

  return result;
}

function personalizeMessage(baseMessage: string, recipient: VisitCandidateRow | InactiveCandidateRow): string {
  const name = [recipient.firstName, recipient.lastName].filter(Boolean).join(' ');
  if (name) {
    return `${name.split(' ')[0]}, ${baseMessage}`;
  }
  return baseMessage;
}

async function logCouponDelivery(
  rule: PromotionRuleRow,
  recipients: (VisitCandidateRow | InactiveCandidateRow)[],
  result: SendResult,
  message: string,
  now: Date,
  trigger: PromotionTrigger,
  subject: string,
): Promise<void> {
  const attemptedIds = recipients.map((r) => r.clientId);

  let emailStatus: string;
  let emailError: string | null = null;

  if (result.attempted === 0) {
    emailStatus = 'no_recipients';
  } else if (result.failed === 0) {
    emailStatus = 'sent';
  } else if (result.sent === 0) {
    emailStatus = 'failed';
    emailError = result.error ?? 'All coupon emails failed to send.';
  } else {
    emailStatus = 'partial_success';
    emailError = result.error ?? `${result.failed} of ${result.attempted} coupon emails failed.`;
  }

  await db.insert(couponDeliveries).values({
    couponId: rule.coupon.id,
    recipientType: 'automation',
    clientIds: attemptedIds,
    logicRule: `promotion_rule:${trigger}`,
    message,
    subject,
    emailStatus,
    emailError: emailError ?? undefined,
    sentAt: now,
    scheduledAt: now,
  });
}

