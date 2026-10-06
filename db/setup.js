require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { pool } = require('../src/config/db')
const bcrypt = require('bcryptjs')

async function run() {
  try {
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8')

    console.log('Applying schema.sql ...')
    await pool.query(schema)

    console.log('Seeding Database with demo data ...')

    // -------------------------------------------------------------------------
    // Hash helper
    // -------------------------------------------------------------------------
    const hash = async (pwd) => await bcrypt.hash(pwd, 10)

    // -------------------------------------------------------------------------
    // 1. USERS
    //    Passwords are DOB in DD-MM-YYYY format (default for all users)
    // -------------------------------------------------------------------------

    // Students (mentor_email links them to a faculty mentor)
    const s1Hash  = await hash('15-05-2002')
    const s2Hash  = await hash('10-10-2003')
    const s3Hash  = await hash('12-06-2001')
    const s4Hash  = await hash('22-03-2002')
    const s5Hash  = await hash('08-08-2004')
    const s6Hash  = await hash('30-01-2003')

    // Faculty
    const f1Hash  = await hash('01-01-1980')
    const f2Hash  = await hash('15-07-1978')

    // Staff
    const st1Hash = await hash('20-08-1985')

    // Counsellors
    const c1Hash  = await hash('10-03-1975')
    const c2Hash  = await hash('15-08-1980')

    // Admin
    const a1Hash  = await hash('05-05-1978')

    // Dean
    const d1Hash  = await hash('12-12-1970')

    console.log('  → Inserting users...')
    await pool.query(`
      INSERT INTO users
        (identifier, name, email, user_type, branch, course, year, mentor_email, password_hash)
      VALUES
        -- Students
        ('20BCS001', 'Aarav Sharma',   '20bcs001@mnnit.ac.in', 'student', 'Computer Science & Engineering', 'B.Tech', '3rd Year', 'dr.ravi@mnnit.ac.in', ?),
        ('21BCS002', 'Priya Gupta',    '21bcs002@mnnit.ac.in', 'student', 'Computer Science & Engineering', 'B.Tech', '2nd Year', 'dr.ravi@mnnit.ac.in', ?),
        ('22MCA003', 'Rohan Kumar',    '22mca003@mnnit.ac.in', 'student', 'Computer Applications',          'MCA',    '1st Year', 'dr.ravi@mnnit.ac.in', ?),
        ('20ECE004', 'Sneha Verma',    '20ece004@mnnit.ac.in', 'student', 'Electronics & Communication',    'B.Tech', '3rd Year', 'dr.pooja@mnnit.ac.in', ?),
        ('21ME005',  'Karan Patel',    '21me005@mnnit.ac.in',  'student', 'Mechanical Engineering',         'B.Tech', '2nd Year', 'dr.pooja@mnnit.ac.in', ?),
        ('23BCS006', 'Nisha Singh',    '23bcs006@mnnit.ac.in', 'student', 'Computer Science & Engineering', 'B.Tech', '1st Year', 'dr.ravi@mnnit.ac.in',  ?),

        -- Faculty (mentors)
        ('dr.ravi@mnnit.ac.in',  'Dr. Ravi Verma',  'dr.ravi@mnnit.ac.in',  'faculty', 'Computer Science & Engineering', NULL, NULL, NULL, ?),
        ('dr.pooja@mnnit.ac.in', 'Dr. Pooja Mishra','dr.pooja@mnnit.ac.in', 'faculty', 'Electronics & Communication',    NULL, NULL, NULL, ?),

        -- Staff
        ('staff@mnnit.ac.in', 'Sunita Devi', 'staff@mnnit.ac.in', 'staff', 'Administration', NULL, NULL, NULL, ?),

        -- Counsellors
        ('counsellor@mnnit.ac.in',  'Dr. Kamlesh Kumar', 'counsellor@mnnit.ac.in',  'counsellor', NULL, NULL, NULL, NULL, ?),
        ('counsellor2@mnnit.ac.in', 'Dr. Anjali Desai',  'counsellor2@mnnit.ac.in', 'counsellor', NULL, NULL, NULL, NULL, ?),

        -- Admin
        ('admin@mnnit.ac.in', 'Mr. Ramesh Tiwari', 'admin@mnnit.ac.in', 'administrator', NULL, NULL, NULL, NULL, ?),

        -- Dean
        ('dean@mnnit.ac.in', 'Prof. Neeraj Tyagi', 'dean@mnnit.ac.in', 'dean', NULL, NULL, NULL, NULL, ?)
    `, [
      s1Hash, s2Hash, s3Hash, s4Hash, s5Hash, s6Hash,
      f1Hash, f2Hash,
      st1Hash,
      c1Hash, c2Hash,
      a1Hash,
      d1Hash
    ])

    // -------------------------------------------------------------------------
    // 2. COUNSELLOR SCHEDULES
    // -------------------------------------------------------------------------
    const [counsellorRows] = await pool.query(
      'SELECT id, identifier FROM users WHERE user_type = "counsellor"'
    )
    const c1id = counsellorRows.find(u => u.identifier === 'counsellor@mnnit.ac.in').id
    const c2id = counsellorRows.find(u => u.identifier === 'counsellor2@mnnit.ac.in').id

    console.log('  → Inserting counsellor schedules...')
    await pool.query(`
      INSERT INTO counsellor_schedules
        (counsellor_id, day_of_week, start_time, end_time, slot_duration, mode, is_active)
      VALUES
        (?, 1, '09:00:00', '12:00:00', 30, 'both',    1),
        (?, 2, '14:00:00', '17:00:00', 30, 'online',  1),
        (?, 3, '10:00:00', '13:00:00', 30, 'offline', 1),
        (?, 4, '09:00:00', '12:00:00', 30, 'both',    1),
        (?, 1, '14:00:00', '17:00:00', 30, 'online',  1),
        (?, 3, '14:00:00', '16:00:00', 30, 'offline', 1),
        (?, 5, '10:00:00', '13:00:00', 30, 'both',    1)
    `, [c1id, c1id, c1id, c1id, c2id, c2id, c2id])

    // -------------------------------------------------------------------------
    // 3. APPOINTMENTS
    // -------------------------------------------------------------------------
    const [studentRows] = await pool.query(
      'SELECT id, identifier FROM users WHERE user_type = "student"'
    )
    const s1id = studentRows.find(u => u.identifier === '20BCS001').id
    const s2id = studentRows.find(u => u.identifier === '21BCS002').id
    const s3id = studentRows.find(u => u.identifier === '22MCA003').id
    const s4id = studentRows.find(u => u.identifier === '20ECE004').id
    const s5id = studentRows.find(u => u.identifier === '21ME005').id

    console.log('  → Inserting appointments...')
    await pool.query(`
      INSERT INTO appointments
        (booker_id, requested_counsellor_id, counsellor_id, appointment_date, time_slot, description, status, action_performed, resolution)
      VALUES
        -- Aarav: upcoming PENDING
        (?, ?, ?, DATE_ADD(CURRENT_DATE(), INTERVAL 2 DAY),  '10:00 AM', 'Feeling very stressed about upcoming semester exams and unable to concentrate.', 'PENDING', NULL, NULL),

        -- Aarav: past COMPLETED
        (?, ?, ?, DATE_SUB(CURRENT_DATE(), INTERVAL 14 DAY), '02:00 PM', 'Sleep disturbance and general anxiety.', 'COMPLETED', 'Discussed sleep hygiene routines, breathing exercises suggested.', 'RESOLVED'),

        -- Aarav: past COMPLETED
        (?, ?, ?, DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY), '11:00 AM', 'Feeling isolated and unmotivated.', 'COMPLETED', 'Peer support and journaling recommended.', 'FOLLOW_UP'),

        -- Priya: upcoming APPROVED
        (?, ?, ?, DATE_ADD(CURRENT_DATE(), INTERVAL 1 DAY),  '09:00 AM', 'Anxiety attacks during presentations and social settings.', 'APPROVED', NULL, NULL),

        -- Priya: past COMPLETED
        (?, ?, ?, DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY),  '10:00 AM', 'Homesickness and adjustment difficulties.', 'COMPLETED', 'Family call recommended, campus clubs suggested.', 'RESOLVED'),

        -- Rohan: PENDING (general, no specific counsellor)
        (?, NULL, NULL, DATE_ADD(CURRENT_DATE(), INTERVAL 4 DAY), '11:00 AM', 'Career confusion and academic pressure from family.', 'PENDING', NULL, NULL),

        -- Rohan: REJECTED
        (?, ?, ?, DATE_SUB(CURRENT_DATE(), INTERVAL 3 DAY), '03:00 PM', 'Missed session — rescheduling request.', 'REJECTED', 'Student did not show up without prior notice.', NULL),

        -- Sneha: COMPLETED (referred for further help)
        (?, ?, ?, DATE_SUB(CURRENT_DATE(), INTERVAL 20 DAY), '02:00 PM', 'Persistent low mood and loss of interest in studies.', 'COMPLETED', 'Referred to psychiatrist for further evaluation.', 'REFERRED'),

        -- Sneha: upcoming PENDING
        (?, ?, ?, DATE_ADD(CURRENT_DATE(), INTERVAL 5 DAY),  '09:00 AM', 'Follow-up session after referral.', 'PENDING', NULL, NULL),

        -- Karan: COMPLETED
        (?, ?, ?, DATE_SUB(CURRENT_DATE(), INTERVAL 10 DAY), '01:00 PM', 'Substance use (smoking) and peer pressure.', 'COMPLETED', 'De-addiction counselling initiated.', 'FOLLOW_UP')
    `, [
      s1id, c1id, c1id,
      s1id, c1id, c1id,
      s1id, c2id, c2id,
      s2id, c1id, c1id,
      s2id, c2id, c2id,
      s3id,
      s3id, c1id, c1id,
      s4id, c2id, c2id,
      s4id, c1id, c1id,
      s5id, c1id, c1id
    ])

    // -------------------------------------------------------------------------
    // 4. TEAM MEMBERS
    // -------------------------------------------------------------------------
    console.log('  → Inserting team members...')
    await pool.query(`
      INSERT INTO team_members (category, name, role, email, phone, qualification, expertise) VALUES
      ('Deans',       'Prof. Neeraj Tyagi',  'Dean, Student Welfare',              'dean@mnnit.ac.in',         '+91-532-2271-235', 'Ph.D. in Administration',           'Student welfare, academic policy and institutional governance.'),
      ('Counsellors', 'Dr. Kamlesh Kumar',   'Senior Counselling Psychologist',    'counsellor@mnnit.ac.in',   '+91-532-2271-240', 'M.Phil in Clinical Psychology',     'Individual counselling, stress management and crisis intervention.'),
      ('Counsellors', 'Dr. Anjali Desai',    'Counselling Psychologist',           'counsellor2@mnnit.ac.in',  '+91-532-2271-241', 'M.Sc. in Psychology',               'Career counselling, anxiety management and group therapy.'),
      ('Mentors',     'Dr. Ravi Verma',      'Faculty Mentor – CSE Dept.',         'dr.ravi@mnnit.ac.in',      '+91-532-2271-300', 'Ph.D. in Computer Science',         'Academic mentoring and student wellbeing for CSE students.'),
      ('Mentors',     'Dr. Pooja Mishra',    'Faculty Mentor – ECE Dept.',         'dr.pooja@mnnit.ac.in',     '+91-532-2271-310', 'Ph.D. in Electronics',              'Academic mentoring and student wellbeing for ECE students.')
    `)

    // -------------------------------------------------------------------------
    // 5. EMERGENCY CONTACTS
    // -------------------------------------------------------------------------
    console.log('  → Inserting emergency contacts...')
    await pool.query(`
      INSERT INTO emergency_contacts (category, label, name, role, office, department, phone, email, is_danger) VALUES
      ('heads',     'CMHW Head',          'Prof. Neeraj Tyagi',  'Dean, Student Welfare',   'Admin Block, Room 101', NULL,                      '+91-532-2271-235', 'dean@mnnit.ac.in',        0),
      ('heads',     'Lead Counsellor',    'Dr. Kamlesh Kumar',   'Senior Psychologist',     'MHC Office, Ground Fl.', 'Mental Health Centre',   '+91-532-2271-240', 'counsellor@mnnit.ac.in',  0),
      ('rows',      NULL,                 NULL,                  NULL,                      NULL,                    'MNNIT Health Centre',     '+91-532-2271-911', NULL,                      1),
      ('rows',      NULL,                 NULL,                  NULL,                      NULL,                    'iCall Helpline',          '9152987821',       NULL,                      1),
      ('rows',      NULL,                 NULL,                  NULL,                      NULL,                    'Vandrevala Foundation',   '1860-2662-345',    NULL,                      1),
      ('rows',      NULL,                 NULL,                  NULL,                      NULL,                    'National Helpline (NIMHANS)', '080-46110007', NULL,                      1)
    `)

    // -------------------------------------------------------------------------
    // 6. EVENTS
    // -------------------------------------------------------------------------
    console.log('  → Inserting events...')
    await pool.query(`
      INSERT INTO events (title, date, description, guest) VALUES
      ('Stress Management Workshop',      'October 15, 2025', 'An interactive workshop covering breathing techniques, mindfulness, and practical stress management strategies for students.', 'Dr. Priya Nair, Clinical Psychologist'),
      ('Mental Health Awareness Week',    'November 1-7, 2025', 'A week-long series of activities including talks, art therapy sessions, peer support circles, and poster campaigns to raise awareness about mental health.', NULL),
      ('Career Counselling Seminar',      'October 28, 2025', 'Guidance on career planning, dealing with academic pressure, and making informed decisions post-graduation.', 'Ms. Kavita Rao, Career Coach'),
      ('De-addiction Awareness Drive',    'September 20, 2025', 'Awareness session on the effects of substance use and available support resources on campus.', NULL),
      ('Yoga & Mindfulness Session',      'Every Friday, 6:30 AM', 'Weekly yoga and mindfulness sessions open to all students, faculty and staff. Conducted at the Sports Ground.', NULL)
    `)

    // -------------------------------------------------------------------------
    // 7. ARTICLES
    // -------------------------------------------------------------------------
    console.log('  → Inserting wellness articles...')
    await pool.query(`
      INSERT INTO articles (id, type, status, title, author, date, excerpt, color, body, submitted_by, approved_at) VALUES
      ('art-001', 'internal', 'approved', 'How to Manage Exam Stress Effectively', 'Dr. Anjali Desai', 'September 10, 2025',
        'Exams are one of the most stressful experiences for students. Learn science-backed strategies to manage anxiety and perform your best.',
        '#4f46e5',
        '{"blocks":[{"type":"paragraph","text":"Exam stress is normal, but when it becomes overwhelming it can impact your mental and physical health. Here are some strategies that work."},{"type":"heading","text":"1. Plan and Prioritise"},{"type":"paragraph","text":"Break your syllabus into small, manageable chunks. Use a timetable and stick to it. Avoid last-minute cramming — it increases anxiety without improving performance."},{"type":"heading","text":"2. Take Regular Breaks"},{"type":"paragraph","text":"The Pomodoro Technique — 25 minutes of focused study followed by a 5-minute break — is scientifically shown to improve focus and retention."},{"type":"heading","text":"3. Practice Deep Breathing"},{"type":"paragraph","text":"When you feel anxious, try 4-7-8 breathing: inhale for 4 seconds, hold for 7, exhale for 8. This activates your parasympathetic nervous system and reduces stress hormones."},{"type":"heading","text":"4. Sleep is Non-Negotiable"},{"type":"paragraph","text":"Memory consolidation happens during sleep. Aim for 7-8 hours per night, especially in the days leading up to exams."},{"type":"paragraph","text":"If you are struggling despite these strategies, please reach out to the MHC counsellors — we are here for you."}]}',
        'counsellor2@mnnit.ac.in', NOW()),

      ('art-002', 'internal', 'approved', 'Understanding Anxiety: You Are Not Alone', 'Dr. Kamlesh Kumar', 'August 25, 2025',
        'Anxiety is one of the most common mental health challenges faced by college students. This article helps you understand what it is and when to seek help.',
        '#059669',
        '{"blocks":[{"type":"paragraph","text":"Feeling anxious before a big event is perfectly normal. But for many students, anxiety becomes a constant companion that affects every aspect of their lives."},{"type":"heading","text":"What Does Anxiety Feel Like?"},{"type":"paragraph","text":"Anxiety can manifest as racing thoughts, a pounding heart, sweaty palms, difficulty breathing, or a sense of impending doom — even when there is no obvious threat."},{"type":"heading","text":"Common Triggers in College"},{"type":"paragraph","text":"Academic pressure, social situations, uncertain futures, family expectations, and financial stress are common triggers for college students."},{"type":"heading","text":"When to Seek Help"},{"type":"paragraph","text":"If anxiety is interfering with your daily life — affecting your sleep, relationships, or academic performance — it is time to talk to someone. The MHC is a safe, confidential space where you can get the support you deserve."}]}',
        'counsellor@mnnit.ac.in', NOW()),

      ('art-003', 'internal', 'approved', 'Building Healthy Sleep Habits', 'Dr. Anjali Desai', 'July 15, 2025',
        'Poor sleep is a silent epidemic among college students. Discover practical habits that can transform your sleep quality and mental wellbeing.',
        '#d97706',
        '{"blocks":[{"type":"paragraph","text":"Sleep deprivation among college students is at an all-time high. With academic demands, social life, and screen time competing for your nights, quality sleep often loses."},{"type":"heading","text":"Why Sleep Matters"},{"type":"paragraph","text":"Sleep is when your brain processes emotions, consolidates memory, and repairs itself. Chronic sleep deprivation is linked to depression, anxiety, and impaired cognitive function."},{"type":"heading","text":"Tips for Better Sleep"},{"type":"paragraph","text":"Keep a consistent sleep schedule — even on weekends. Avoid screens for at least an hour before bed. Keep your room cool and dark. Avoid caffeine after 2 PM."},{"type":"heading","text":"The 20-Minute Rule"},{"type":"paragraph","text":"If you cannot fall asleep within 20 minutes, get up and do something calming like reading until you feel sleepy. This prevents your brain from associating bed with wakefulness."}]}',
        'counsellor2@mnnit.ac.in', NOW())
    `)

    console.log('\n✅ Database setup complete! Here are your demo login credentials:\n')
    console.log('┌─────────────────────────────────────────────────────────────────────────┐')
    console.log('│                        DEMO LOGIN CREDENTIALS                           │')
    console.log('├──────────────────┬───────────────────────────────┬───────────────────────┤')
    console.log('│ Role             │ User ID / Email               │ Password (DOB)        │')
    console.log('├──────────────────┼───────────────────────────────┼───────────────────────┤')
    console.log('│ Student          │ 20BCS001                      │ 15-05-2002            │')
    console.log('│ Student          │ 21BCS002                      │ 10-10-2003            │')
    console.log('│ Student          │ 22MCA003                      │ 12-06-2001            │')
    console.log('│ Student          │ 20ECE004                      │ 22-03-2002            │')
    console.log('│ Student          │ 21ME005                       │ 08-08-2004            │')
    console.log('│ Faculty Mentor   │ dr.ravi@mnnit.ac.in           │ 01-01-1980            │')
    console.log('│ Faculty Mentor   │ dr.pooja@mnnit.ac.in          │ 15-07-1978            │')
    console.log('│ Counsellor       │ counsellor@mnnit.ac.in        │ 10-03-1975            │')
    console.log('│ Counsellor       │ counsellor2@mnnit.ac.in       │ 15-08-1980            │')
    console.log('│ Administrator    │ admin@mnnit.ac.in             │ 05-05-1978            │')
    console.log('│ Dean             │ dean@mnnit.ac.in              │ 12-12-1970            │')
    console.log('└──────────────────┴───────────────────────────────┴───────────────────────┘')
    console.log('\n💡 Faculty Mentors (dr.ravi & dr.pooja) can log in via Reports → Faculty Mentor')
    console.log('   to see their assigned students and appointment history.\n')

  } catch (err) {
    console.error('❌ Database setup failed:', err.stack || err)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

run()
