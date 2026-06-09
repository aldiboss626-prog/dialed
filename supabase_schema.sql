-- ── Dialed schema for Supabase ──────────────────────────────────────────────
-- Run this entire file in: Supabase Dashboard → SQL Editor → New query

-- Contacts
CREATE TABLE IF NOT EXISTS contacts (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  role text,
  relationship_type text check (relationship_type in ('Mentor','Professor','Recruiter','Friend','Other')),
  email text,
  stars integer default 3 check (stars between 1 and 5),
  cadence_days integer default 14,
  last_contact_date date default current_date,
  notes text,
  gmail_connected boolean default false,
  created_at timestamptz default now()
);

-- Interactions
CREATE TABLE IF NOT EXISTS interactions (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  date date not null default current_date,
  note text,
  type text check (type in ('email','call','message','meeting')) default 'call',
  created_at timestamptz default now()
);

-- Opportunities
CREATE TABLE IF NOT EXISTS opportunities (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id bigint references contacts(id) on delete set null,
  title text not null,
  status text check (status in ('Active','Waiting','Completed','Missed')) default 'Active',
  deadline date,
  notes text,
  created_at timestamptz default now()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  contact_id bigint references contacts(id) on delete cascade,
  opportunity_id bigint references opportunities(id) on delete cascade,
  type text check (type in ('urgent','deadline','cadence','positive','awaiting_reply')),
  title text not null,
  body text not null,
  is_read boolean default false,
  created_at timestamptz default now()
);

-- Email threads
CREATE TABLE IF NOT EXISTS email_threads (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  subject text not null,
  sender text not null,
  recipient text not null,
  date timestamptz not null default now(),
  preview text,
  body text,
  is_from_user boolean default true,
  created_at timestamptz default now()
);

-- Pending responses
CREATE TABLE IF NOT EXISTS pending_responses (
  id bigint generated always as identity primary key,
  contact_id bigint references contacts(id) on delete cascade not null,
  email_thread_id bigint references email_threads(id) on delete cascade,
  detected_at timestamptz default now(),
  stars_at_detection integer,
  last_notified_at timestamptz,
  notification_count integer default 0,
  status text check (status in ('pending','responded','dismissed')) default 'pending',
  created_at timestamptz default now()
);

-- ── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions      ENABLE ROW LEVEL SECURITY;
ALTER TABLE opportunities     ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_threads     ENABLE ROW LEVEL SECURITY;
ALTER TABLE pending_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own contacts"          ON contacts          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own interactions"      ON interactions      FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own opportunities"     ON opportunities     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own notifications"     ON notifications     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own email_threads"     ON email_threads     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own pending_responses" ON pending_responses FOR ALL USING (
  contact_id IN (SELECT id FROM contacts WHERE user_id = auth.uid())
);
