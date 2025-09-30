import { pgTable, foreignKey, serial, uuid, text, numeric, boolean, timestamp, unique, json, integer, uniqueIndex, date, jsonb, varchar, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const couponType = pgEnum("coupon_type", ['percent', 'flat'])


export const stylistServices = pgTable("stylist_services", {
	id: serial().primaryKey().notNull(),
	stylistId: uuid("stylist_id").notNull(),
	serviceName: text("service_name").notNull(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	isCustom: boolean("is_custom").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.stylistId],
			foreignColumns: [stylists.id],
			name: "stylist_services_stylist_id_stylists_id_fk"
		}),
]);

export const stylists = pgTable("stylists", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	email: text().notNull(),
	passwordHash: text("password_hash").notNull(),
	businessName: text("business_name"),
	appSlug: text("app_slug"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	firstName: text("first_name"),
	lastName: text("last_name"),
	phone: text(),
	location: text(),
	servicesOffered: json("services_offered"),
	bio: text(),
	businessHours: json("business_hours"),
	yearsOfExperience: integer("years_of_experience"),
	instagramHandle: text("instagram_handle"),
	bookingLink: text("booking_link"),
	appQrCodeUrl: text("app_qr_code_url"),
}, (table) => [
	unique("stylists_email_unique").on(table.email),
	unique("stylists_app_slug_unique").on(table.appSlug),
]);

export const appointments = pgTable("appointments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stylistId: uuid("stylist_id").notNull(),
	clientId: uuid("client_id").notNull(),
	serviceId: integer("service_id").notNull(),
	date: date().notNull(),
	startTime: text("start_time").notNull(),
	endTime: text("end_time").notNull(),
	status: text().default('confirmed').notNull(),
	notes: text(),
	totalPrice: numeric("total_price", { precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("appointments_u_stylist_date_time").using("btree", table.stylistId.asc().nullsLast().op("text_ops"), table.date.asc().nullsLast().op("text_ops"), table.startTime.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.stylistId],
			foreignColumns: [stylists.id],
			name: "appointments_stylist_id_stylists_id_fk"
		}),
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [clients.id],
			name: "appointments_client_id_clients_id_fk"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [stylistServices.id],
			name: "appointments_service_id_stylist_services_id_fk"
		}),
]);

export const stylistAvailability = pgTable("stylist_availability", {
	id: serial().primaryKey().notNull(),
	stylistId: uuid("stylist_id").notNull(),
	date: date().notNull(),
	isOpen: boolean("is_open").default(true).notNull(),
	timeRanges: jsonb("time_ranges").default([]).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	uniqueIndex("stylist_availability_u_stylist_date").using("btree", table.stylistId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.stylistId],
			foreignColumns: [stylists.id],
			name: "stylist_availability_stylist_id_stylists_id_fk"
		}),
]);

export const coupons = pgTable("coupons", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stylistId: uuid("stylist_id").notNull(),
	name: text().notNull(),
	type: text().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	serviceId: integer("service_id"),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.stylistId],
			foreignColumns: [stylists.id],
			name: "coupons_stylist_id_stylists_id_fk"
		}),
	foreignKey({
			columns: [table.serviceId],
			foreignColumns: [stylistServices.id],
			name: "coupons_service_id_stylist_services_id_fk"
		}),
]);

export const session = pgTable("session", {
	sid: varchar().primaryKey().notNull(),
	sess: json().notNull(),
	expire: timestamp({ mode: 'string' }).notNull(),
});

export const clients = pgTable("clients", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	stylistId: uuid("stylist_id").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	email: text(),
	phone: text(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	optInMarketing: boolean("opt_in_marketing").default(false).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.stylistId],
			foreignColumns: [stylists.id],
			name: "clients_stylist_id_stylists_id_fk"
		}),
]);

export const couponDeliveries = pgTable("coupon_deliveries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	couponId: uuid("coupon_id").notNull(),
	recipientType: text("recipient_type").notNull(),
	clientIds: jsonb("client_ids").default([]),
	logicRule: text("logic_rule"),
	scheduledAt: timestamp("scheduled_at", { mode: 'string' }).defaultNow(),
	sentAt: timestamp("sent_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	message: text().notNull(),
	smsStatus: text("sms_status").default('pending'),
	smsSid: text("sms_sid"),
	smsError: text("sms_error"),
	deliveredAt: timestamp("delivered_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.couponId],
			foreignColumns: [coupons.id],
			name: "coupon_deliveries_coupon_id_coupons_id_fk"
		}),
]);

export const messages = pgTable("messages", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	conversationId: text("conversation_id").notNull(),
	senderId: uuid("sender_id").notNull(),
	senderType: text("sender_type").notNull(),
	receiverId: uuid("receiver_id").notNull(),
	receiverType: text("receiver_type").notNull(),
	content: text("content").notNull(),
	isRead: boolean("is_read").default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
]);

