-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."coupon_type" AS ENUM('percent', 'flat');--> statement-breakpoint
CREATE TABLE "stylist_services" (
	"id" serial PRIMARY KEY NOT NULL,
	"stylist_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"is_custom" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stylists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"business_name" text,
	"created_at" timestamp DEFAULT now(),
	"first_name" text,
	"last_name" text,
	"phone" text,
	"location" text,
	"services_offered" json,
	"bio" text,
	"business_hours" json,
	"years_of_experience" integer,
	"instagram_handle" text,
	"booking_link" text,
	CONSTRAINT "stylists_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"client_id" uuid NOT NULL,
	"service_id" integer NOT NULL,
	"date" date NOT NULL,
	"start_time" text NOT NULL,
	"end_time" text NOT NULL,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"notes" text,
	"total_price" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "stylist_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"stylist_id" uuid NOT NULL,
	"date" date NOT NULL,
	"is_open" boolean DEFAULT true NOT NULL,
	"time_ranges" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"service_id" integer,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "session" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" json NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"stylist_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"notes" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"opt_in_marketing" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupon_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"coupon_id" uuid NOT NULL,
	"recipient_type" text NOT NULL,
	"client_ids" jsonb DEFAULT '[]'::jsonb,
	"logic_rule" text,
	"scheduled_at" timestamp DEFAULT now(),
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now(),
	"message" text NOT NULL,
	"sms_status" text DEFAULT 'pending',
	"sms_sid" text,
	"sms_error" text,
	"delivered_at" timestamp
);
--> statement-breakpoint
ALTER TABLE "stylist_services" ADD CONSTRAINT "stylist_services_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_stylist_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."stylist_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stylist_availability" ADD CONSTRAINT "stylist_availability_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_service_id_stylist_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."stylist_services"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_stylist_id_stylists_id_fk" FOREIGN KEY ("stylist_id") REFERENCES "public"."stylists"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_deliveries" ADD CONSTRAINT "coupon_deliveries_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_u_stylist_date_time" ON "appointments" USING btree ("stylist_id" text_ops,"date" text_ops,"start_time" date_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "stylist_availability_u_stylist_date" ON "stylist_availability" USING btree ("stylist_id" date_ops,"date" date_ops);
*/