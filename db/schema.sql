-- ---------------------------------------------------------------------------
-- MHC Database Schema (MySQL)
-- ---------------------------------------------------------------------------

-- Clean re-run support (safe to run multiple times in dev)
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS emergency_contacts;
DROP TABLE IF EXISTS team_members;
DROP TABLE IF EXISTS events;
DROP TABLE IF EXISTS articles;
DROP TABLE IF EXISTS counsellor_schedules;
DROP TABLE IF EXISTS users;

-- ---------------------------------------------------------------------------
-- USERS
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  identifier          VARCHAR(255) UNIQUE NOT NULL,
  name                VARCHAR(255) NOT NULL,
  email               VARCHAR(255),
  user_type           ENUM('student','faculty','staff','counsellor','administrator','dean') NOT NULL,
  branch              VARCHAR(255),
  course              VARCHAR(255),
  year                VARCHAR(50),
  mentor_email        VARCHAR(255),
  password_hash       VARCHAR(255) NOT NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_users_mentor ON users(mentor_email);

-- ---------------------------------------------------------------------------
-- COUNSELLOR SCHEDULES
-- ---------------------------------------------------------------------------
CREATE TABLE counsellor_schedules (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  counsellor_id       INT NOT NULL,
  day_of_week         INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time          TIME NOT NULL,
  end_time            TIME NOT NULL,
  slot_duration       INT NOT NULL DEFAULT 30,
  mode                ENUM('online', 'offline', 'both') NOT NULL,
  is_active           TINYINT(1) NOT NULL DEFAULT 1,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (counsellor_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_counsellor_schedules_counsellor ON counsellor_schedules(counsellor_id);
CREATE INDEX idx_counsellor_schedules_day ON counsellor_schedules(day_of_week);

-- ---------------------------------------------------------------------------
-- APPOINTMENTS
-- ---------------------------------------------------------------------------
CREATE TABLE appointments (
  request_id          INT AUTO_INCREMENT PRIMARY KEY,
  booker_id           INT NOT NULL,
  requested_counsellor_id INT,
  counsellor_id        INT,
  appointment_date     DATE NOT NULL,
  time_slot            VARCHAR(50) NOT NULL,
  description          TEXT,
  status               ENUM('PENDING','APPROVED','COMPLETED','REJECTED') NOT NULL DEFAULT 'PENDING',
  action_performed      TEXT,
  resolution           ENUM('RESOLVED','FOLLOW_UP','REFERRED'),
  prescription         TEXT,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (booker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (requested_counsellor_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (counsellor_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_appointments_booker ON appointments(booker_id);
CREATE INDEX idx_appointments_requested_counsellor ON appointments(requested_counsellor_id);
CREATE INDEX idx_appointments_counsellor ON appointments(counsellor_id);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);

-- NOTE: MySQL does not support partial unique indexes. Overlapping appointments
-- need to be checked in application logic (e.g. controllers).

-- ---------------------------------------------------------------------------
-- PASSWORD RESETS
-- ---------------------------------------------------------------------------
CREATE TABLE password_resets (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  user_id       INT NOT NULL,
  token         VARCHAR(255) UNIQUE NOT NULL,
  expires_at    DATETIME NOT NULL,
  used          TINYINT(1) NOT NULL DEFAULT 0,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------------------------
-- OPTIONAL: Public content tables
-- ---------------------------------------------------------------------------
CREATE TABLE team_members (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  category       VARCHAR(100) NOT NULL,
  name           VARCHAR(255) NOT NULL,
  role           VARCHAR(255),
  email          VARCHAR(255),
  phone          VARCHAR(50),
  qualification  TEXT,
  expertise      TEXT,
  photo_url      TEXT,
  image_base64   LONGTEXT
);

CREATE TABLE events (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  title          VARCHAR(255) NOT NULL,
  date           VARCHAR(100) NOT NULL,
  description    TEXT,
  guest          VARCHAR(255),
  image_base64   LONGTEXT,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE articles (
  id             VARCHAR(255) PRIMARY KEY,
  type           VARCHAR(50) DEFAULT 'internal',
  status         ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  title          VARCHAR(255) NOT NULL,
  author         VARCHAR(255) NOT NULL,
  date           VARCHAR(100),
  excerpt        TEXT,
  color          VARCHAR(50),
  body           JSON,
  submitted_by   VARCHAR(255),
  submitted_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  approved_at    DATETIME,
  image_base64   LONGTEXT
);

CREATE TABLE emergency_contacts (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  category   VARCHAR(100) NOT NULL,
  label      VARCHAR(255),
  name       VARCHAR(255),
  role       VARCHAR(255),
  office     VARCHAR(255),
  department VARCHAR(255),
  phone      VARCHAR(50),
  email      VARCHAR(255),
  is_danger  TINYINT(1) DEFAULT 0
);
