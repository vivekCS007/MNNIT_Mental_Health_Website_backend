-- ---------------------------------------------------------------------------
-- MHC Database Schema (PostgreSQL)
-- Run with:  psql -U <user> -d mhc_db -f db/schema.sql
-- (or use: npm run db:setup   which runs schema.sql + seed.sql automatically)
-- ---------------------------------------------------------------------------

-- Clean re-run support (safe to run multiple times in dev)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS password_resets CASCADE;
DROP TABLE IF EXISTS emergency_contacts CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS counsellor_schedules CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ---------------------------------------------------------------------------
-- USERS  (students, faculty, staff, counsellors, administrators, dean)
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                  SERIAL PRIMARY KEY,
  identifier          TEXT UNIQUE NOT NULL,   -- registration number (student) or official email (others)
  name                TEXT NOT NULL,
  email               TEXT,
  user_type           TEXT NOT NULL CHECK (user_type IN ('student','faculty','staff','counsellor','administrator','dean')),
  branch              TEXT,                   -- students only
  course              TEXT,                   -- students only
  year                TEXT,                   -- students only
  password_hash       TEXT NOT NULL,          -- bcrypt hash of DOB (DD-MM-YYYY) or chosen password
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_user_type ON users(user_type);

-- ---------------------------------------------------------------------------
-- COUNSELLOR SCHEDULES (Managed by Admin)
-- ---------------------------------------------------------------------------
CREATE TABLE counsellor_schedules (
  id                  SERIAL PRIMARY KEY,
  counsellor_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  day_of_week         INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon, ..., 6=Sat
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  slot_duration       INTEGER NOT NULL DEFAULT 30, -- in minutes
  mode                TEXT NOT NULL CHECK (mode IN ('online', 'offline', 'both')),
  is_active           BOOLEAN NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_counsellor_schedules_counsellor ON counsellor_schedules(counsellor_id);
CREATE INDEX idx_counsellor_schedules_day ON counsellor_schedules(day_of_week);

-- ---------------------------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
  request_id          SERIAL PRIMARY KEY,
  booker_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- student/faculty/staff who booked
  requested_counsellor_id INTEGER REFERENCES users(id) ON DELETE SET NULL,       -- requested specifically (null = general)
  counsellor_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,          -- assigned once approved
  appointment_date     DATE NOT NULL,
  time_slot            TEXT NOT NULL,
  description          TEXT,
  status               TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','APPROVED','COMPLETED','REJECTED')),
  action_performed      TEXT,                 -- session notes, filled on completion
  resolution           TEXT CHECK (resolution IN ('RESOLVED','FOLLOW_UP','REFERRED')),
  prescription         TEXT,                 -- doctor's prescription / advice, added by counsellor
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_appointments_booker ON appointments(booker_id);
CREATE INDEX idx_appointments_requested_counsellor ON appointments(requested_counsellor_id);
CREATE INDEX idx_appointments_counsellor ON appointments(counsellor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- MUTEX: Prevent overlapping appointments for the same counsellor at the same time slot
-- (Only applies to slots that are PENDING or APPROVED/COMPLETED, rejected ones don't lock the slot)
CREATE UNIQUE INDEX unique_counsellor_slot 
ON appointments (counsellor_id, appointment_date, time_slot) 
WHERE status IN ('PENDING', 'APPROVED', 'COMPLETED') AND counsellor_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- PASSWORD RESETS  (for /auth/forgot-password + /auth/reset-password)
-- ---------------------------------------------------------------------------
CREATE TABLE password_resets (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token         TEXT UNIQUE NOT NULL,
  expires_at    TIMESTAMPTZ NOT NULL,
  used          BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- OPTIONAL: Public content tables (Phase 2 — team page & emergency contacts)
-- Everything else on the public pages (FAQs, articles, events, counselling
-- schedule) still lives in src/data/*.js on the frontend. Add tables the
-- same way if/when you want those editable from a backend too.
-- ---------------------------------------------------------------------------
CREATE TABLE team_members (
  id             SERIAL PRIMARY KEY,
  category       TEXT NOT NULL,     -- e.g. 'Deans', 'Counsellors'
  name           TEXT NOT NULL,
  role           TEXT,
  email          TEXT,
  phone          TEXT,
  qualification  TEXT,
  expertise      TEXT,
  photo_url      TEXT
);

CREATE TABLE emergency_contacts (
  id         SERIAL PRIMARY KEY,
  category   TEXT NOT NULL,   -- 'heads' | 'rows' | 'contacts'
  label      TEXT,
  name       TEXT,
  role       TEXT,
  office     TEXT,
  department TEXT,
  phone      TEXT,
  email      TEXT,
  is_danger  BOOLEAN DEFAULT false
);
