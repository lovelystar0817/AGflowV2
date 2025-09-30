DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'business_type') THEN
		CREATE TYPE "public"."business_type" AS ENUM('Hairstylist', 'Barber', 'Nail Technician', 'Massage Therapist');
	END IF;
END$$;

DO $$
BEGIN
	IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
		CREATE TYPE "public"."notification_type" AS ENUM('thank_you', 'follow_up', 'rebook_prompt');
	END IF;
END$$;
CREATE TABLE "action_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"action" text NOT NULL,
	"args" jsonb NOT NULL,
	"result" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ai_executions" (
	"id" serial PRIMARY KEY NOT NULL,
	"stylist_id" uuid NOT NULL,
	"key" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "ai_executions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "ai_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"cost_cents" integer DEFAULT 0 NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"date" text NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "client_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"visit_date" date DEFAULT now() NOT NULL,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" text NOT NULL,
	"sender_id" uuid NOT NULL,
	"sender_type" text NOT NULL,
	"receiver_id" uuid NOT NULL,
	"receiver_type" text NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"type" "notification_type" NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"scheduled_at" timestamp NOT NULL,
	"sent_at" timestamp,
	"status" text DEFAULT 'pending' NOT NULL,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "promotion_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"trigger" text NOT NULL,
	"condition" json NOT NULL,
	"reward_coupon_id" uuid NOT NULL,
	"active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "promotion_rules_trigger_check" CHECK ("promotion_rules"."trigger" IN ('after_n_visits', 'inactive_n_weeks'))
);
--> statement-breakpoint
DROP INDEX "appointments_u_stylist_date_time";--> statement-breakpoint
DROP INDEX "stylist_availability_u_stylist_date";--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "status" SET DEFAULT 'scheduled';--> statement-breakpoint
ALTER TABLE "stylist_services" ADD COLUMN "duration_minutes" integer;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "business_type" "business_type" DEFAULT 'Hairstylist';--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "sms_sender_name" text;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "default_appointment_duration" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "preferred_slot_format" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "show_publicly" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "theme_id" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "portfolio_photos" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "app_slug" text;--> statement-breakpoint
ALTER TABLE "stylists" ADD COLUMN "app_qr_code_url" text;--> statement-breakpoint
ALTER TABLE "coupon_deliveries" ADD COLUMN "subject" text NOT NULL;--> statement-breakpoint
ALTER TABLE "coupon_deliveries" ADD COLUMN "email_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "coupon_deliveries" ADD COLUMN "email_id" text;--> statement-breakpoint
ALTER TABLE "coupon_deliveries" ADD COLUMN "email_error" text;--> statement-breakpoint
ALTER TABLE "client_visits" ADD CONSTRAINT "client_visits_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_visits" ADD CONSTRAINT "client_visits_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "client_visits" ADD CONSTRAINT "client_visits_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "promotion_rules" ADD CONSTRAINT "promotion_rules_reward_coupon_id_coupons_id_fk" FOREIGN KEY ("reward_coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_log_stylist_created_idx" ON "action_log" USING btree ("stylist_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "ai_executions_stylist_key_idx" ON "ai_executions" USING btree ("stylist_id","key");--> statement-breakpoint
CREATE INDEX "ai_usage_stylist_date_idx" ON "ai_usage" USING btree ("stylist_id","date");--> statement-breakpoint
CREATE INDEX "client_visits_stylist_client_idx" ON "client_visits" USING btree ("stylist_id","client_id");--> statement-breakpoint
CREATE INDEX "messages_conversation_id_idx" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "messages_sender_id_idx" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "messages_receiver_id_idx" ON "messages" USING btree ("receiver_id");--> statement-breakpoint
CREATE INDEX "promotion_rules_stylist_idx" ON "promotion_rules" USING btree ("stylist_id");--> statement-breakpoint
CREATE INDEX "appointments_stylist_date_idx" ON "appointments" USING btree ("stylist_id","date");--> statement-breakpoint
CREATE INDEX "coupons_stylist_id_idx" ON "coupons" USING btree ("stylist_id");--> statement-breakpoint
CREATE INDEX "clients_stylist_id_idx" ON "clients" USING btree ("stylist_id");--> statement-breakpoint
CREATE INDEX "coupon_deliveries_coupon_id_idx" ON "coupon_deliveries" USING btree ("coupon_id");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_u_stylist_date_time" ON "appointments" USING btree ("stylist_id","date","start_time");--> statement-breakpoint
CREATE UNIQUE INDEX "stylist_availability_u_stylist_date" ON "stylist_availability" USING btree ("stylist_id","date");--> statement-breakpoint
ALTER TABLE "coupon_deliveries" DROP COLUMN "sms_status";--> statement-breakpoint
ALTER TABLE "coupon_deliveries" DROP COLUMN "sms_sid";--> statement-breakpoint
ALTER TABLE "coupon_deliveries" DROP COLUMN "sms_error";--> statement-breakpoint
ALTER TABLE "stylists" ADD CONSTRAINT "stylists_app_slug_unique" UNIQUE("app_slug");