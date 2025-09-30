import { relations } from "drizzle-orm/relations";
import { stylists, stylistServices, appointments, clients, stylistAvailability, coupons, couponDeliveries, messages } from "./schema";

export const stylistServicesRelations = relations(stylistServices, ({one, many}) => ({
	stylist: one(stylists, {
		fields: [stylistServices.stylistId],
		references: [stylists.id]
	}),
	appointments: many(appointments),
	coupons: many(coupons),
}));

export const stylistsRelations = relations(stylists, ({many}) => ({
	stylistServices: many(stylistServices),
	appointments: many(appointments),
	stylistAvailabilities: many(stylistAvailability),
	coupons: many(coupons),
	clients: many(clients),
}));

export const appointmentsRelations = relations(appointments, ({one}) => ({
	stylist: one(stylists, {
		fields: [appointments.stylistId],
		references: [stylists.id]
	}),
	client: one(clients, {
		fields: [appointments.clientId],
		references: [clients.id]
	}),
	stylistService: one(stylistServices, {
		fields: [appointments.serviceId],
		references: [stylistServices.id]
	}),
}));

export const clientsRelations = relations(clients, ({one, many}) => ({
	appointments: many(appointments),
	stylist: one(stylists, {
		fields: [clients.stylistId],
		references: [stylists.id]
	}),
}));

export const stylistAvailabilityRelations = relations(stylistAvailability, ({one}) => ({
	stylist: one(stylists, {
		fields: [stylistAvailability.stylistId],
		references: [stylists.id]
	}),
}));

export const couponsRelations = relations(coupons, ({one, many}) => ({
	stylist: one(stylists, {
		fields: [coupons.stylistId],
		references: [stylists.id]
	}),
	stylistService: one(stylistServices, {
		fields: [coupons.serviceId],
		references: [stylistServices.id]
	}),
	couponDeliveries: many(couponDeliveries),
}));

export const couponDeliveriesRelations = relations(couponDeliveries, ({one}) => ({
	coupon: one(coupons, {
		fields: [couponDeliveries.couponId],
		references: [coupons.id]
	}),
}));