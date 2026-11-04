# CampusTrack — Student Attendance Management

Full-stack rebuild of the original prototype: **Python (Flask) + MongoDB** backend,
with a responsive HTML/CSS/JS frontend that talks to a real REST API instead of
`localStorage`. Same look, same attendance logic, same demo accounts — now backed
by an actual database.

## Stack
- **Backend:** Flask, PyMongo, session-based auth (hashed passwords via Werkzeug)
- **Database:** MongoDB (collections: `users`, `students`, `subjects`, `attendance`, `settings`)
- **Frontend:** Vanilla JS single-page app (`static/`), responsive CSS with dark-mode support — no build step needed
- **System monitor:** Live CPU utilization, per-core load, a 60-second waveform, host memory/frequency telemetry, and parallel attendance calculations on authenticated app pages

## 1. Install MongoDB
Install MongoDB Community Edition and make sure it's running locally (default `mongodb://localhost:27017/`),
or point `MONGO_URI` at Atlas / any remote instance. See https://www.mongodb.com/docs/manual/installation/

## 2. Set up the project
```bash
cd campustrack
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # edit SECRET_KEY / MONGO_URI if needed
```

## 3. Seed the database
Populates the same demo data as the original prototype (8 students, 3 subjects,
24 days of attendance each, 75% requirement):
```bash
python seed.py
```

## 4. Run the app
```bash
python app.py
```
Visit **http://localhost:5050**

## Demo logins
| Role    | ERP ID / Roll | Email                  | Password  | Note                     |
|---------|---------------|-------------------------|-----------|--------------------------|
| Admin   | `ADM-1001`    | `admin@college.com`     | `admin123`| Full system control      |
| Teacher | `FAC-1001`    | `teacher1@college.com`  | `teach123`| Teaches Java & OS        |
| Teacher | `FAC-1002`    | `teacher2@college.com`  | `teach123`| Teaches DBMS             |
| Student | `ERP-101` (101)| `student01@college.com` | `stud123` | Above 75% (Rahul Sharma) |
| Student | `ERP-102` (102)| `student02@college.com` | `stud123` | Below 75% (Priya Singh)  |

## Project structure
```
campustrack/
├── app.py              # Flask app factory / entrypoint
├── config.py           # Env-based config
├── extensions.py       # MongoDB connection
├── auth.py             # Login/logout/session + @login_required decorator
├── routes_admin.py     # /api/admin/*  — dashboard stats, settings
├── routes_teacher.py   # /api/teacher/* — subjects, roster, mark attendance
├── routes_student.py   # /api/student/* — dashboard, per-subject stats
├── utils.py            # Attendance eligibility math (ported from the original)
├── seed.py             # One-time demo data loader
├── requirements.txt
├── .env.example
└── static/
    ├── index.html
    ├── css/
    │   ├── style.css
    │   ├── architecture-lab.css
    │   └── campus-redesign.css
    └── js/
        ├── app.js       # SPA — fetches from the API, renders views
        └── architecture-lab.js
```

## API overview
| Method | Endpoint                  | Who       | Purpose                          |
|--------|----------------------------|-----------|-----------------------------------|
| POST   | `/api/auth/login`          | anyone    | Log in (email, password, role)    |
| POST   | `/api/auth/logout`         | anyone    | Log out                           |
| GET    | `/api/auth/me`             | anyone    | Current session user              |
| GET    | `/api/admin/dashboard`     | admin     | Stats + per-student overall %     |
| GET/POST | `/api/admin/settings`    | admin     | Get/set required attendance %     |
| GET    | `/api/teacher/subjects`    | teacher   | Subjects taught by this teacher   |
| GET    | `/api/teacher/students`    | teacher   | Full student roster               |
| POST   | `/api/teacher/attendance`  | teacher   | Submit a day's attendance         |
| GET    | `/api/student/dashboard`   | student   | Overall + per-subject attendance  |
| GET    | `/api/student/subjects`    | student   | Detailed per-subject breakdown    |
| GET    | `/api/monitor`             | signed-in users | Live CPU and attendance processing metrics |

## Notes on the attendance logic (unchanged from the original)
- **Eligibility is decided by overall attendance across all subjects**, not
  per-subject minimums — per-subject numbers are informational only.
- The required percentage is a single admin-controlled setting, stored in
  the `settings` collection and used everywhere (nothing hardcoded).
- Duplicate attendance submissions for the same subject + date are rejected.

## Architecture Lab
The authenticated workspace includes an Architecture Lab that maps computer
architecture concepts to attendance processing: a five-stage attendance
pipeline, an instruction-cycle trace, policy-driven control, parallel student
calculations, network topology comparisons, CPU/memory concepts, and cache
coherence and synchronization demos. The lab's example records and cycle
counts are educational simulations; they do not change saved attendance or
student eligibility. The existing system monitor continues to report live
host telemetry and server-side attendance calculation metrics.

The task-cycle lesson also covers instruction formats, operation types,
addressing modes, and control micro-operations. Other lessons explain pipeline
hazards, task balancing, network routing and congestion, cache locality and
write policies, programmed I/O, interrupts, DMA, and synchronization
primitives. Student dashboards show the number of additional lectures a
student can miss while remaining at or above the configured attendance
threshold, calculated across all courses.

## Interface
CampusTrack uses a responsive campus dashboard with separate student, faculty,
and administrator workspaces, a split-screen sign-in page, light and dark
themes, and expandable host telemetry. Shared layout and theme styles live in
`static/css/campus-redesign.css`; existing attendance flows are unchanged.

## Production notes
This is set up to run in debug mode for local development. Before deploying:
- Set a strong, random `SECRET_KEY`
- Turn off `debug=True` in `app.py` and run behind a real WSGI server (e.g. gunicorn)
- Restrict MongoDB network access / use authenticated connection strings
- Serve over HTTPS so the session cookie is protected in transit
