-- Add client_visits table to track completed appointments
CREATE TABLE client_visits (
    id uuid primary key default gen_random_uuid(),
    stylist_id uuid not null references stylists(id),
    client_id uuid not null references clients(id),
    appointment_id uuid not null references appointments(id),
    visit_date date not null default now(),
    notes text
);

-- Index for efficient queries by stylist and client
CREATE INDEX client_visits_stylist_client_idx ON client_visits(stylist_id, client_id);