-- Add promotion_rules table for automated coupons
CREATE TABLE promotion_rules (
    id uuid primary key default gen_random_uuid(),
    stylist_id uuid not null references stylists(id),
    trigger text not null check (trigger in ('after_n_visits','inactive_n_weeks')),
    condition jsonb not null,
    reward_coupon_id uuid not null references coupons(id),
    active boolean default true,
    created_at timestamp default now()
);

-- Index for efficient queries by stylist
CREATE INDEX promotion_rules_stylist_idx ON promotion_rules(stylist_id);