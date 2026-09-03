-- ---------------------------------------------------------------------------
-- Seed data — demo accounts for every role so you can log in immediately.
-- Passwords are hashed here using pgcrypto's bcrypt (compatible with the
-- bcryptjs library used in the Node backend).
--
-- Run with:  psql -U <user> -d mhc_db -f db/seed.sql
-- (or: npm run db:setup, which runs schema.sql + seed.sql together)
-- ---------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Login convention used by the frontend (see ROLE_CONFIG in constants/index.js):
--   Student/Faculty/Staff -> identifier = reg no / official email, password = DOB (DD-MM-YYYY)
--   Counsellor/Admin/Dean -> identifier = official email,          password = DOB (DD-MM-YYYY)

INSERT INTO users (identifier, name, email, user_type, branch, course, year, password_hash) VALUES
  ('20BCS001', 'Aarav Sharma', '20bcs001@mnnit.ac.in', 'student', 'Computer Science', 'B.Tech', '3rd Year',
    crypt('15-05-2002', gen_salt('bf'))),
  ('21BCS002', 'Vikram Singh', '21bcs002@mnnit.ac.in', 'student', 'Computer Science', 'B.Tech', '2nd Year',
    crypt('10-10-2003', gen_salt('bf'))),
  ('22MCA003', 'Rohan Gupta', '22mca003@mnnit.ac.in', 'student', 'Computer Applications', 'MCA', '1st Year',
    crypt('12-06-2001', gen_salt('bf'))),

  ('faculty.demo@mnnit.ac.in', 'Dr. Ravi Verma', 'faculty.demo@mnnit.ac.in', 'faculty', 'Electronics & Communication Engineering', NULL, NULL,
    crypt('01-01-1980', gen_salt('bf'))),

  ('staff.demo@mnnit.ac.in', 'Sunita Devi', 'staff.demo@mnnit.ac.in', 'staff', 'Administration', NULL, NULL,
    crypt('20-08-1985', gen_salt('bf'))),

  ('counsellor@mnnit.ac.in', 'Dr. Kamlesh Kumar', 'counsellor@mnnit.ac.in', 'counsellor', NULL, NULL, NULL,
    crypt('10-03-1975', gen_salt('bf'))),
  ('counsellor2@mnnit.ac.in', 'Dr. Anjali Desai', 'counsellor2@mnnit.ac.in', 'counsellor', NULL, NULL, NULL,
    crypt('15-08-1980', gen_salt('bf'))),

  ('admin@mnnit.ac.in', 'Admin User', 'admin@mnnit.ac.in', 'administrator', NULL, NULL, NULL,
    crypt('05-05-1978', gen_salt('bf'))),
  ('admin2@mnnit.ac.in', 'Admin User 2', 'admin2@mnnit.ac.in', 'administrator', NULL, NULL, NULL,
    crypt('10-10-1985', gen_salt('bf'))),

  ('dean@mnnit.ac.in', 'Prof. Neeraj Tyagi', 'dean@mnnit.ac.in', 'dean', NULL, NULL, NULL,
    crypt('12-12-1970', gen_salt('bf'))),
  ('dean2@mnnit.ac.in', 'Prof. Anil Kumar', 'dean2@mnnit.ac.in', 'dean', NULL, NULL, NULL,
    crypt('14-04-1972', gen_salt('bf')));

-- Counsellor Schedules seed data
INSERT INTO counsellor_schedules (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode, is_active)
SELECT u.id, 1, '10:00:00', '13:00:00', 30, 'both', true
FROM users u WHERE u.identifier = 'counsellor@mnnit.ac.in';

INSERT INTO counsellor_schedules (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode, is_active)
SELECT u.id, 2, '14:00:00', '17:00:00', 30, 'online', true
FROM users u WHERE u.identifier = 'counsellor@mnnit.ac.in';

INSERT INTO counsellor_schedules (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode, is_active)
SELECT u.id, 3, '10:00:00', '13:00:00', 30, 'offline', true
FROM users u WHERE u.identifier = 'counsellor@mnnit.ac.in';

INSERT INTO counsellor_schedules (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode, is_active)
SELECT u.id, 1, '14:00:00', '17:00:00', 30, 'both', true
FROM users u WHERE u.identifier = 'counsellor2@mnnit.ac.in';

INSERT INTO counsellor_schedules (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode, is_active)
SELECT u.id, 4, '09:00:00', '12:00:00', 30, 'online', true
FROM users u WHERE u.identifier = 'counsellor2@mnnit.ac.in';

-- A couple of sample appointments so the dashboards aren't empty on first run.
INSERT INTO appointments (booker_id, requested_counsellor_id, counsellor_id, appointment_date, time_slot, description, status)
SELECT u.id, c.id, c.id, CURRENT_DATE + 2, '10:00:00', 'Feeling stressed about upcoming exams.', 'PENDING'
FROM users u, users c
WHERE u.identifier = '20BCS001' AND c.identifier = 'counsellor@mnnit.ac.in';

INSERT INTO appointments (booker_id, requested_counsellor_id, counsellor_id, appointment_date, time_slot, description, status, action_performed, resolution)
SELECT u.id, c.id, c.id, CURRENT_DATE - 5, '14:00:00', 'Sleep issues.', 'COMPLETED', 'Discussed sleep hygiene techniques.', 'RESOLVED'
FROM users u, users c
WHERE u.identifier = '20BCS001' AND c.identifier = 'counsellor@mnnit.ac.in';

INSERT INTO appointments (booker_id, requested_counsellor_id, counsellor_id, appointment_date, time_slot, description, status)
SELECT u.id, NULL, NULL, CURRENT_DATE + 3, '11:00:00', 'General stress and anxiety (General request)', 'PENDING'
FROM users u
WHERE u.identifier = '21BCS002';

-- Sample public content (optional Phase 2 tables)
INSERT INTO team_members (category, name, role, email, phone, qualification, expertise) VALUES
  ('Deans', 'Prof. Neeraj Tyagi', 'Academic Affairs', 'headadmin@mnnit.ac.in', '+91-512-2259-101', 'Ph.D. in Administration', 'Oversees administration, policy, and partnerships.'),
  ('Counsellors', 'Dr. Kamlesh Kumar', 'Professional Counsellor / Psychologist', 'counsellor@mnnit.ac.in', '+91-512-2259-200', 'M.Phil Clinical Psychology', 'Individual counselling and crisis support.');

INSERT INTO emergency_contacts (category, label, name, role, office, department, phone, email, is_danger) VALUES
  ('heads', 'CMHW Heads', 'Prof. Neeraj Tyagi', 'Head-Admin', 'Dean Office', NULL, '+91-512-2259-101', 'headadmin@mnnit.ac.in', false),
  ('rows', NULL, NULL, NULL, NULL, 'Health Centre (Ambulance)', '+91-512-2259-911', NULL, true);
