import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE

def build_presentation(output_path="CampusTrack_Presentation.pptx"):
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)
    blank_layout = prs.slide_layouts[6]

    # Color Palette: Cyber Glassmorphism & High-Tech Obsidian
    BG_DARK = RGBColor(11, 15, 25)       # #0B0F19
    SURFACE_CARD = RGBColor(23, 32, 51)  # #172033
    SURFACE_ALT = RGBColor(30, 41, 59)   # #1E293B
    BORDER_COLOR = RGBColor(51, 65, 85)  # #334155
    ACCENT_CYAN = RGBColor(6, 182, 212)  # #06B6D4
    ACCENT_INDIGO = RGBColor(99, 102, 241) # #6366F1
    ACCENT_GREEN = RGBColor(16, 185, 129) # #10B981
    ACCENT_AMBER = RGBColor(245, 158, 11) # #F59E0B
    ACCENT_RED = RGBColor(239, 68, 68)   # #EF4444
    TEXT_MAIN = RGBColor(248, 250, 252)  # #F8FAFC
    TEXT_MUTED = RGBColor(148, 163, 184) # #94A3B8

    def add_bg(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, category, title, subtitle=None):
        add_bg(slide)

        # Top Category / System Pill
        pill = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.45), Inches(2.2), Inches(0.32))
        pill.fill.solid()
        pill.fill.fore_color.rgb = SURFACE_ALT
        pill.line.color.rgb = ACCENT_CYAN
        pill.line.width = Pt(1)
        tf = pill.text_frame
        tf.word_wrap = True
        p = tf.paragraphs[0]
        p.text = f"●  {category.upper()}"
        p.font.size = Pt(10)
        p.font.bold = True
        p.font.color.rgb = ACCENT_CYAN
        p.alignment = PP_ALIGN.CENTER

        # Slide Title
        t_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.82), Inches(11.7), Inches(0.65))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title
        p.font.size = Pt(24)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN

        # Optional Subtitle
        if subtitle:
            s_box = slide.shapes.add_textbox(Inches(0.8), Inches(1.45), Inches(11.7), Inches(0.35))
            stf = s_box.text_frame
            stf.word_wrap = True
            stf.margin_left = stf.margin_top = stf.margin_right = stf.margin_bottom = 0
            sp = stf.paragraphs[0]
            sp.text = subtitle
            sp.font.size = Pt(13)
            sp.font.color.rgb = TEXT_MUTED

        # Bottom subtle footer
        f_box = slide.shapes.add_textbox(Inches(0.8), Inches(7.05), Inches(11.7), Inches(0.3))
        ftf = f_box.text_frame
        fp = ftf.paragraphs[0]
        fp.text = "CampusTrack v2.4 · Enterprise Attendance Intelligence & Hardware Telemetry"
        fp.font.size = Pt(9)
        fp.font.color.rgb = TEXT_MUTED

    def add_card(slide, left, top, width, height, title="", border_color=BORDER_COLOR, bg_color=SURFACE_CARD):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = bg_color
        card.line.color.rgb = border_color
        card.line.width = Pt(1)

        if title:
            # Title pill/header inside card
            t_box = slide.shapes.add_textbox(left + Inches(0.2), top + Inches(0.18), width - Inches(0.4), Inches(0.4))
            tf = t_box.text_frame
            tf.word_wrap = True
            tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
            p = tf.paragraphs[0]
            p.text = title
            p.font.size = Pt(15)
            p.font.bold = True
            p.font.color.rgb = TEXT_MAIN

        return card

    # =========================================================================
    # SLIDE 1: TITLE SLIDE (COVER)
    # =========================================================================
    s1 = prs.slides.add_slide(blank_layout)
    add_bg(s1)

    # Ambient Glow / Banner Box
    cover_box = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.0), Inches(1.2), Inches(11.333), Inches(5.1))
    cover_box.fill.solid()
    cover_box.fill.fore_color.rgb = SURFACE_CARD
    cover_box.line.color.rgb = ACCENT_INDIGO
    cover_box.line.width = Pt(2)

    # Top Brand Tag
    tag = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(1.5), Inches(1.6), Inches(2.8), Inches(0.38))
    tag.fill.solid()
    tag.fill.fore_color.rgb = SURFACE_ALT
    tag.line.color.rgb = ACCENT_CYAN
    tag.line.width = Pt(1)
    tf = tag.text_frame
    p = tf.paragraphs[0]
    p.text = "⚡ ACADEMIC INTELLIGENCE PLATFORM"
    p.font.size = Pt(10)
    p.font.bold = True
    p.font.color.rgb = ACCENT_CYAN
    p.alignment = PP_ALIGN.CENTER

    # Logo + Title
    title_box = s1.shapes.add_textbox(Inches(1.5), Inches(2.2), Inches(10.3), Inches(1.5))
    tf = title_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "CampusTrack"
    p.font.size = Pt(46)
    p.font.bold = True
    p.font.color.rgb = TEXT_MAIN

    p2 = tf.add_paragraph()
    p2.text = "Student Attendance Intelligence & Real-Time Hardware Telemetry System"
    p2.font.size = Pt(19)
    p2.font.color.rgb = ACCENT_CYAN
    p2.space_before = Pt(8)

    desc_box = s1.shapes.add_textbox(Inches(1.5), Inches(3.9), Inches(10.3), Inches(1.1))
    tf = desc_box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.text = "A modern, multi-role academic portal engineered for real-time attendance compliance, interactive what-if simulation, and institutional monitoring backed by parallel computing and hardware telemetry."
    p.font.size = Pt(13)
    p.font.color.rgb = TEXT_MUTED

    # 3 Pill Badges at bottom of cover
    badges = [
        ("🪪 Dual-Mode Auth", "ERP ID & College Email"),
        ("⚡ Telemetry Engine", "60s Waveform & Core Matrix"),
        ("🎓 3 Dedicated Portals", "Student, Faculty & Admin")
    ]
    for i, (b_title, b_sub) in enumerate(badges):
        bx = Inches(1.5 + i * 3.55)
        by = Inches(5.15)
        b_shape = s1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, bx, by, Inches(3.3), Inches(0.75))
        b_shape.fill.solid()
        b_shape.fill.fore_color.rgb = SURFACE_ALT
        b_shape.line.color.rgb = BORDER_COLOR
        b_shape.line.width = Pt(1)
        tf = b_shape.text_frame
        p = tf.paragraphs[0]
        p.text = b_title
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN
        p2 = tf.add_paragraph()
        p2.text = b_sub
        p2.font.size = Pt(10)
        p2.font.color.rgb = ACCENT_INDIGO

    # =========================================================================
    # SLIDE 2: EXECUTIVE SUMMARY & PLATFORM OVERVIEW
    # =========================================================================
    s2 = prs.slides.add_slide(blank_layout)
    add_header(s2, "Executive Overview", "CampusTrack at a Glance", "Modernizing higher education attendance management with real-time analytics and predictive insights.")

    exec_cards = [
        ("Unified Academic Operations",
         "Replaces disconnected paper sheets and sluggish legacy portals with a cohesive single-page application. Serves 3 distinct roles (Students, Faculty, and Administrators) through a centralized secure architecture.",
         ACCENT_INDIGO),
        ("Student-Centric Intelligence",
         "Empowers students with dynamic Attendance Health Gauges, 24-day lecture heatmap punch-cards, and a real-time 'What-If' Attendance Simulator to plan ahead and safeguard academic eligibility.",
         ACCENT_CYAN),
        ("Institutional Governance",
         "Equips college management and deans with real-time compliance tiering, customizable attendance thresholds, live student registries, and instant university audit CSV exports.",
         ACCENT_GREEN),
        ("Parallel Compute & Telemetry",
         "Features an integrated multi-core hardware monitor with 60-second Catmull-Rom Bezier waveform oscilloscope, 3×2 core allocation matrix, and sub-millisecond multi-worker benchmark execution.",
         ACCENT_AMBER)
    ]

    for i, (ctitle, cdesc, ccolor) in enumerate(exec_cards):
        cx = Inches(0.8 + (i % 2) * 5.95)
        cy = Inches(1.9 + (i // 2) * 2.45)
        add_card(s2, cx, cy, Inches(5.75), Inches(2.2), ctitle, border_color=ccolor)
        t_box = s2.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.65), Inches(5.35), Inches(1.4))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = cdesc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 3: PROBLEM STATEMENT & CHALLENGES
    # =========================================================================
    s3 = prs.slides.add_slide(blank_layout)
    add_header(s3, "Industry Motivation", "The Challenge with Legacy Attendance Systems", "Why higher education institutions struggle with traditional attendance tracking.")

    col1 = add_card(s3, Inches(0.8), Inches(1.9), Inches(5.75), Inches(4.9), "Critical Industry Problems", border_color=ACCENT_RED)
    c1_box = s3.shapes.add_textbox(Inches(1.05), Inches(2.6), Inches(5.25), Inches(4.0))
    tf1 = c1_box.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0
    problems = [
        ("Fragmented & Inaccurate Records", "Manual registers and paper sheets lead to frequent tallying errors, lost records, and proxy attendance without audit trails."),
        ("No Early-Warning for Students", "Students typically discover their attendance shortage (<75%) right before semester finals, leading to sudden debarment and academic distress."),
        ("Teacher Administrative Burden", "Faculty spend 10-15 minutes of every lecture manually marking registers, followed by laborious monthly reconciliation."),
        ("Slow Institutional Audits", "Compiling college-wide attendance reports for UGC/AICTE inspections requires days of manual data aggregation across departments.")
    ]
    for p_title, p_desc in problems:
        p = tf1.add_paragraph()
        p.text = f"❌  {p_title}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_RED
        p.space_before = Pt(6)
        p_sub = tf1.add_paragraph()
        p_sub.text = p_desc
        p_sub.font.size = Pt(10.5)
        p_sub.font.color.rgb = TEXT_MUTED

    col2 = add_card(s3, Inches(6.75), Inches(1.9), Inches(5.75), Inches(4.9), "The CampusTrack Solution", border_color=ACCENT_GREEN)
    c2_box = s3.shapes.add_textbox(Inches(7.0), Inches(2.6), Inches(5.25), Inches(4.0))
    tf2 = c2_box.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0
    solutions = [
        ("Instant Digital Attendance Matrix", "Faculty mark entire classes in under 30 seconds with 1-click bulk toggles (All Present, All Absent, Invert)."),
        ("Live Student Health & Simulation", "Students track real-time percentages per course with an interactive simulator showing exactly how many classes they can safely miss."),
        ("Dual-Mode Enterprise Access", "Seamless authentication using either ERP ID (e.g. ERP-101, FAC-1001) or institutional email with encrypted SHA-256 passwords."),
        ("Automated Institutional Compliance", "Real-time tiering (Distinction, Safe, Warning, Critical) with dynamic threshold adjustments and instant CSV exports.")
    ]
    for s_title, s_desc in solutions:
        p = tf2.add_paragraph()
        p.text = f"✓  {s_title}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_GREEN
        p.space_before = Pt(6)
        p_sub = tf2.add_paragraph()
        p_sub.text = s_desc
        p_sub.font.size = Pt(10.5)
        p_sub.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 4: ARCHITECTURE & TECHNOLOGY STACK
    # =========================================================================
    s4 = prs.slides.add_slide(blank_layout)
    add_header(s4, "System Engineering", "Architecture & Technical Specifications", "High-performance full-stack design built for responsiveness and data integrity.")

    tech_blocks = [
        ("Frontend Client Architecture", [
            ("Core Tech", "Modern Vanilla ES6+ SPA (Zero heavy build dependencies)"),
            ("UI Design", "Obsidian Cyber-Glassmorphism theme with CSS Custom Properties"),
            ("Data Viz", "Native SVG Catmull-Rom cubic Bezier waveform & radial health gauge"),
            ("Performance", "Real-time rAF frame synchronization (60 Hz / 120 Hz ProMotion)")
        ], ACCENT_CYAN),
        ("Backend Services & APIs", [
            ("Framework", "Python 3 + Flask with Modular Blueprints"),
            ("Authentication", "Dual-Mode Identifier Resolver (ERP ID or College Email)"),
            ("Encryption", "SHA-256 salted hashing with secure session management"),
            ("REST Endpoints", "Stateless JSON APIs for Student, Teacher, Admin, and Telemetry")
        ], ACCENT_INDIGO),
        ("Database & Persistence", [
            ("Engine", "MongoDB Document Store via PyMongo Client"),
            ("Collections", "Users, Students, Courses, Attendance Logs, System Metrics"),
            ("Data Integrity", "Automated ERP ID migration & roll-number harmonization"),
            ("Seed Pipeline", "50+ pre-seeded student records, faculty rosters & course logs")
        ], ACCENT_GREEN),
        ("Hardware Engine & Telemetry", [
            ("OS Telemetry", "Direct kernel hardware queries (CPU load, clock frequencies, RAM)"),
            ("Core Matrix", "3×2 Multi-Core load allocation with 8-segment LED meters"),
            ("Parallel Engine", "Multi-worker parallel evaluation benchmark for campus metrics"),
            ("Simulation", "Dynamic workload simulator (Idle, Normal, Batch, Turbo Stress)")
        ], ACCENT_AMBER)
    ]

    for i, (btitle, bitems, bcolor) in enumerate(tech_blocks):
        bx = Inches(0.8 + (i % 2) * 5.95)
        by = Inches(1.9 + (i // 2) * 2.45)
        add_card(s4, bx, by, Inches(5.75), Inches(2.2), btitle, border_color=bcolor)
        t_box = s4.shapes.add_textbox(bx + Inches(0.2), by + Inches(0.65), Inches(5.35), Inches(1.4))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for label, val in bitems:
            p = tf.add_paragraph()
            p.text = f"• {label}: "
            p.font.size = Pt(11)
            p.font.bold = True
            p.font.color.rgb = TEXT_MAIN
            run = p.add_run()
            run.text = val
            run.font.bold = False
            run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 5: MULTI-ROLE ECOSYSTEM
    # =========================================================================
    s5 = prs.slides.add_slide(blank_layout)
    add_header(s5, "Role-Based Workflows", "Three Distinct Portals, One Unified System", "Tailored interfaces engineered specifically for each stakeholder's responsibilities.")

    roles = [
        ("🎓 Student Portal", ACCENT_CYAN, [
            "Attendance Health Radial Gauge (Target 75%)",
            "Interactive 'What-If' Attendance Simulator",
            "Per-Course Attendance Breakdown & Status",
            "24-Day Lecture Heatmap Punch-Card Grid",
            "Safe-Miss Allowance & Deficit Calculation",
            "Real-time Examination Eligibility Verification"
        ]),
        ("👨‍🏫 Faculty Portal", ACCENT_INDIGO, [
            "Subject & Lecture Period Dropdown Selectors",
            "Automatic Lunch Hour Validation (12:30 - 13:30)",
            "One-Click Bulk Toggles (All Present, All Absent, Invert)",
            "Searchable Real-Time Student Roll Matrix",
            "Instant Single-Click Attendance Submissions",
            "Lecture History & Historical Audit Logs"
        ]),
        ("⚡ Administrator Portal", ACCENT_GREEN, [
            "Campus-Wide Institutional Attendance KPI Gauges",
            "Academic Tiering (Distinction, Safe, Warning, Critical)",
            "Searchable & Sortable Student Roster Registry",
            "Dynamic Minimum Attendance Criteria Slider",
            "One-Click University CSV Data Archive Export",
            "Multi-Worker Parallel Hardware Compute Benchmark"
        ])
    ]

    for i, (rtitle, rcolor, rpoints) in enumerate(roles):
        rx = Inches(0.8 + i * 3.95)
        ry = Inches(1.9)
        add_card(s5, rx, ry, Inches(3.8), Inches(4.9), rtitle, border_color=rcolor)
        t_box = s5.shapes.add_textbox(rx + Inches(0.2), ry + Inches(0.65), Inches(3.4), Inches(4.0))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        for pt in rpoints:
            p = tf.add_paragraph()
            p.text = f"✓  {pt}"
            p.font.size = Pt(11)
            p.font.color.rgb = TEXT_MUTED
            p.space_before = Pt(8)

    # =========================================================================
    # SLIDE 6: STUDENT PORTAL DEEP DIVE
    # =========================================================================
    s6 = prs.slides.add_slide(blank_layout)
    add_header(s6, "Student Experience", "Student Portal & What-If Projection Engine", "Actionable transparency that puts academic planning directly in the student's hands.")

    # Left: Radial Gauge & Simulator
    add_card(s6, Inches(0.8), Inches(1.9), Inches(5.75), Inches(4.9), "Radial Health Gauge & Simulator", border_color=ACCENT_CYAN)
    t_box1 = s6.shapes.add_textbox(Inches(1.05), Inches(2.6), Inches(5.25), Inches(4.0))
    tf1 = t_box1.text_frame
    tf1.word_wrap = True
    tf1.margin_left = tf1.margin_top = tf1.margin_right = tf1.margin_bottom = 0

    s_pts = [
        ("Radial Attendance Health Gauge", "Dynamic color-coded SVG arc displaying aggregate attendance vs 75% requirement. Shows instant status: Eligible, Borderline, or Critical."),
        ("Interactive 'What-If' Simulator", "Students adjust a class attendance slider to project future attendance outcomes. Instantly recalculates eligibility before attending or missing classes."),
        ("Safe Absence Allowance", "Automatically calculates the exact number of consecutive lectures a student can miss while remaining above the 75% threshold."),
        ("Deficit Recovery Counter", "If below 75%, clearly shows exactly how many consecutive classes must be attended to regain examination clearance.")
    ]
    for h, d in s_pts:
        p = tf1.add_paragraph()
        p.text = f"•  {h}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_CYAN
        p.space_before = Pt(6)
        p2 = tf1.add_paragraph()
        p2.text = d
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = TEXT_MUTED

    # Right: Subject Cards & 24-Day Heatmap
    add_card(s6, Inches(6.75), Inches(1.9), Inches(5.75), Inches(4.9), "Subject Analytics & Heatmap Grid", border_color=ACCENT_INDIGO)
    t_box2 = s6.shapes.add_textbox(Inches(7.0), Inches(2.6), Inches(5.25), Inches(4.0))
    tf2 = t_box2.text_frame
    tf2.word_wrap = True
    tf2.margin_left = tf2.margin_top = tf2.margin_right = tf2.margin_bottom = 0

    s_pts2 = [
        ("Modular Subject Cards", "Displays course title, code (e.g. CS-301, CS-302), faculty in-charge, attended lectures, total lectures, and percentage."),
        ("24-Day Lecture Heatmap", "A visual punch-card grid for every course showing attendance history across the last 24 days: Present (Green), Absent (Red), and Holiday (Gray)."),
        ("Live Criteria Check", "Every course card features a dynamic eligibility tag ('Eligible' or 'Deficit') updated instantly upon faculty submission."),
        ("Mobile-Optimized UX", "Responsive touch-friendly layout allows students to check their standing on smartphones seamlessly.")
    ]
    for h, d in s_pts2:
        p = tf2.add_paragraph()
        p.text = f"•  {h}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO
        p.space_before = Pt(6)
        p2 = tf2.add_paragraph()
        p2.text = d
        p2.font.size = Pt(10.5)
        p2.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 7: FACULTY PORTAL & LECTURE MANAGEMENT
    # =========================================================================
    s7 = prs.slides.add_slide(blank_layout)
    add_header(s7, "Faculty Experience", "Faculty Portal: Rapid Lecture Attendance", "Streamlined 30-second attendance marking with validation safeguards.")

    f_cards = [
        ("Smart Lecture Scheduling",
         "Faculty select from assigned courses (e.g. Java Programming, Operating Systems) and lecture periods (09:00 - 17:00). Includes built-in lunch break validation (12:30 - 13:30) preventing accidental submissions.",
         ACCENT_INDIGO),
        ("Mass-Action Bulk Toggles",
         "Includes 3 powerful quick-action controls: 'Mark All Present' (instant default), 'Mark All Absent', and 'Invert Selection' for fast exceptions marking.",
         ACCENT_CYAN),
        ("Searchable Student Matrix",
         "Real-time student search by Name, Roll Number, or ERP ID. Interactive student cards toggle between Present (emerald green) and Absent (coral red) with a single click.",
         ACCENT_GREEN),
        ("Audit Logs & Persistence",
         "Attendance records are written to MongoDB with timestamps, faculty IDs, and lecture period metadata. Duplicate submissions for the same period are prevented automatically.",
         ACCENT_AMBER)
    ]

    for i, (ctitle, cdesc, ccolor) in enumerate(f_cards):
        cx = Inches(0.8 + (i % 2) * 5.95)
        cy = Inches(1.9 + (i // 2) * 2.45)
        add_card(s7, cx, cy, Inches(5.75), Inches(2.2), ctitle, border_color=ccolor)
        t_box = s7.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.65), Inches(5.35), Inches(1.4))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = cdesc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 8: ADMIN PORTAL & INSTITUTIONAL COMPLIANCE
    # =========================================================================
    s8 = prs.slides.add_slide(blank_layout)
    add_header(s8, "Institutional Governance", "Admin Portal: College-Wide Compliance", "Comprehensive analytics and regulatory compliance monitoring for academic leaders.")

    # 4 Top Stats Cards
    kpis = [
        ("Campus Attendance", "78.4%", "Aggregate across 50 students", ACCENT_GREEN),
        ("Total Students", "50", "Enrolled across active batches", ACCENT_CYAN),
        ("Active Faculty", "2", "Teaching 8 credit courses", ACCENT_INDIGO),
        ("Compute Latency", "1.15 ms", "Multi-worker parallel speed", ACCENT_AMBER)
    ]
    for i, (k_title, k_val, k_sub, k_col) in enumerate(kpis):
        kx = Inches(0.8 + i * 2.95)
        k_card = add_card(s8, kx, Inches(1.9), Inches(2.8), Inches(1.3), "", border_color=k_col)
        ktf = k_card.text_frame
        ktf.word_wrap = True
        p1 = ktf.paragraphs[0]
        p1.text = k_title.upper()
        p1.font.size = Pt(10)
        p1.font.bold = True
        p1.font.color.rgb = TEXT_MUTED
        p2 = ktf.add_paragraph()
        p2.text = k_val
        p2.font.size = Pt(22)
        p2.font.bold = True
        p2.font.color.rgb = k_col
        p3 = ktf.add_paragraph()
        p3.text = k_sub
        p3.font.size = Pt(9)
        p3.font.color.rgb = TEXT_MUTED

    # Bottom 2 Feature Cards
    f1 = add_card(s8, Inches(0.8), Inches(3.45), Inches(5.75), Inches(3.35), "Tiered Attendance Distribution", border_color=ACCENT_INDIGO)
    f1_box = s8.shapes.add_textbox(Inches(1.05), Inches(4.05), Inches(5.25), Inches(2.6))
    tf1 = f1_box.text_frame
    tf1.word_wrap = True
    f_items1 = [
        ("Distinction Tier (≥ 85%)", "Recognizes top-tier attendees eligible for academic honors."),
        ("Safe Compliance Tier (75% - 84%)", "Standard eligibility zone meeting all university board mandates."),
        ("Warning Tier (60% - 74%)", "Automated alert zone requiring counseling and remedial attendance."),
        ("Critical Debar Tier (< 60%)", "Flagged for exam debarment; triggers immediate dean-level review.")
    ]
    for h, d in f_items1:
        p = tf1.add_paragraph()
        p.text = f"• {h}: "
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    f2 = add_card(s8, Inches(6.75), Inches(3.45), Inches(5.75), Inches(3.35), "Registry, Criteria Slider & CSV Export", border_color=ACCENT_GREEN)
    f2_box = s8.shapes.add_textbox(Inches(7.0), Inches(4.05), Inches(5.25), Inches(2.6))
    tf2 = f2_box.text_frame
    tf2.word_wrap = True
    f_items2 = [
        ("Interactive Criteria Slider", "Adjust college eligibility threshold in real-time (65% to 85%) to preview institutional impact before policy updates."),
        ("Sortable Student Registry Table", "Instant multi-column sorting by Roll Number, ERP ID, Name, Percentage, and Status with live search filtering."),
        ("One-Click University CSV Export", "Generates compliant CSV archives containing complete attendance rosters for accreditation (NBA/NAAC) filings."),
        ("Parallel Compute Benchmark", "Executes multi-threaded evaluation across all courses in under 2 milliseconds.")
    ]
    for h, d in f_items2:
        p = tf2.add_paragraph()
        p.text = f"• {h}: "
        p.font.size = Pt(11)
        p.font.bold = True
        p.font.color.rgb = TEXT_MAIN
        run = p.add_run()
        run.text = d
        run.font.bold = False
        run.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 9: REAL-TIME HARDWARE TELEMETRY & SIMULATOR
    # =========================================================================
    s9 = prs.slides.add_slide(blank_layout)
    add_header(s9, "Engineering Excellence", "Real-Time Telemetry & Hardware Workload Simulator", "Bringing system observability and hardware simulation directly into an academic platform.")

    telem_cards = [
        ("60s Waveform Oscilloscope",
         "A live continuous Catmull-Rom cubic Bezier waveform plotting host CPU load over a rolling 60-second window. Rendered dynamically via SVG with cyan glow filter, baseline gridlines, and animated radar pulse tracker.",
         ACCENT_CYAN),
        ("3×2 Microprocessor Core Matrix",
         "Displays physical cores (CORE 00 to CORE 05) with 8-segment LED meters, dynamic clock frequencies (1.8 to 3.6 GHz), and status tags (IDLE, ACTIVE, TURBO). Click-to-inspect HUD reveals temperature, clock, and hyperthreads.",
         ACCENT_INDIGO),
        ("Hardware Workload Simulator",
         "Interactive simulator toolbar featuring 5 workload modes: ⚡ Live Sync, 🟢 Idle (12%), 🔵 Normal (38%), 🟡 Batch Attendance (76%), and 🔴 Turbo Stress (98%). Allows testing system responsiveness and graph behavior under simulated load.",
         ACCENT_AMBER),
        ("Instant Workload Spike Injection",
         "Features an '⚡ Inject Spike' trigger that simulates an immediate 98% compute burst for 8 seconds. The oscilloscope spikes in real-time, core meters turn red, and dynamic frequency scaling ramps up before smooth decay.",
         ACCENT_GREEN)
    ]

    for i, (ctitle, cdesc, ccolor) in enumerate(telem_cards):
        cx = Inches(0.8 + (i % 2) * 5.95)
        cy = Inches(1.9 + (i // 2) * 2.45)
        add_card(s9, cx, cy, Inches(5.75), Inches(2.2), ctitle, border_color=ccolor)
        t_box = s9.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.65), Inches(5.35), Inches(1.4))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = cdesc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 10: SECURITY & DUAL-MODE AUTHENTICATION
    # =========================================================================
    s10 = prs.slides.add_slide(blank_layout)
    add_header(s10, "Security & Identity", "Dual-Mode Authentication & Data Protection", "Enterprise-grade identity resolution engineered for campus-wide adoption.")

    sec_cards = [
        ("Dual-Mode Identifier Resolution",
         "Users authenticate effortlessly using either their ERP ID / Roll Number (e.g. ERP-101, FAC-1001, ADM-1001) or standard Institutional Email. Automatic resolution maps numeric rolls to ERP identifiers seamlessly.",
         ACCENT_CYAN),
        ("Cryptographic Security",
         "All passwords are protected with SHA-256 cryptographic hashing. Client inputs include password visibility toggles ('👁️' / '🙈') and strict credential validation prevents injection attacks.",
         ACCENT_INDIGO),
        ("Role-Based Access Control (RBAC)",
         "Strict backend role enforcement: Students can only view their own attendance records; Faculty can only mark their assigned courses; Administrators have broad governance and export privileges.",
         ACCENT_GREEN),
        ("1-Click Demo Evaluation",
         "Instant autofill chips for Student (ERP-101), Faculty (FAC-1001), and Administrator (ADM-1001) allow evaluators, deans, and auditors to test all three portals in seconds.",
         ACCENT_AMBER)
    ]

    for i, (ctitle, cdesc, ccolor) in enumerate(sec_cards):
        cx = Inches(0.8 + (i % 2) * 5.95)
        cy = Inches(1.9 + (i // 2) * 2.45)
        add_card(s10, cx, cy, Inches(5.75), Inches(2.2), ctitle, border_color=ccolor)
        t_box = s10.shapes.add_textbox(cx + Inches(0.2), cy + Inches(0.65), Inches(5.35), Inches(1.4))
        tf = t_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = cdesc
        p.font.size = Pt(12)
        p.font.color.rgb = TEXT_MUTED

    # =========================================================================
    # SLIDE 11: MEASURABLE IMPACT & PERFORMANCE RESULTS
    # =========================================================================
    s11 = prs.slides.add_slide(blank_layout)
    add_header(s11, "Value Delivered", "Business Impact & Operational Results", "Quantifiable efficiency gains achieved through CampusTrack implementation.")

    metrics = [
        ("95% Reduction", "In Faculty Attendance Marking Time", "Classes logged in under 30 seconds vs 10+ minutes manually.", ACCENT_GREEN),
        ("100% Real-Time", "Student Transparency & What-If Planning", "Zero surprises before semester examinations.", ACCENT_CYAN),
        ("< 2 ms Latency", "Multi-Worker Parallel Calculation", "Sub-millisecond attendance compute across entire batches.", ACCENT_INDIGO),
        ("Zero Discrepancy", "Accreditation & Audit Readies", "1-click instant university-compliant CSV archives.", ACCENT_AMBER)
    ]

    for i, (m_title, m_label, m_sub, m_col) in enumerate(metrics):
        mx = Inches(0.8 + (i % 2) * 5.95)
        my = Inches(1.9 + (i // 2) * 2.45)
        m_card = add_card(s11, mx, my, Inches(5.75), Inches(2.2), "", border_color=m_col)
        mtf = m_card.text_frame
        mtf.word_wrap = True
        p1 = mtf.paragraphs[0]
        p1.text = m_title
        p1.font.size = Pt(28)
        p1.font.bold = True
        p1.font.color.rgb = m_col
        p2 = mtf.add_paragraph()
        p2.text = m_label
        p2.font.size = Pt(14)
        p2.font.bold = True
        p2.font.color.rgb = TEXT_MAIN
        p2.space_before = Pt(4)
        p3 = mtf.add_paragraph()
        p3.text = m_sub
        p3.font.size = Pt(11)
        p3.font.color.rgb = TEXT_MUTED
        p3.space_before = Pt(4)

    # =========================================================================
    # SLIDE 12: FUTURE ROADMAP & CONCLUSION
    # =========================================================================
    s12 = prs.slides.add_slide(blank_layout)
    add_header(s12, "Next Steps", "Future Roadmap & Conclusion", "Scaling CampusTrack to smart campus IoT, automated notifications, and AI forecasting.")

    col1 = add_card(s12, Inches(0.8), Inches(1.9), Inches(5.75), Inches(4.9), "Future Roadmap", border_color=ACCENT_CYAN)
    c1_box = s12.shapes.add_textbox(Inches(1.05), Inches(2.6), Inches(5.25), Inches(4.0))
    tf1 = c1_box.text_frame
    tf1.word_wrap = True
    roadmap = [
        ("IoT RFID & Biometric Gate Sync", "Direct integration with turnstile biometric hardware and NFC student identity cards."),
        ("Automated Guardian Alerts", "SMS and WhatsApp automated notifications triggered whenever a student dips below 75%."),
        ("AI Predictive Attendance Warnings", "Machine learning forecasting student risk patterns based on weekday trends and course difficulty."),
        ("Mobile App Companion (iOS & Android)", "Native hybrid wrappers with push notifications for instant class updates and timetable changes.")
    ]
    for r_title, r_desc in roadmap:
        p = tf1.add_paragraph()
        p.text = f"🚀  {r_title}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_CYAN
        p.space_before = Pt(6)
        p_sub = tf1.add_paragraph()
        p_sub.text = r_desc
        p_sub.font.size = Pt(10.5)
        p_sub.font.color.rgb = TEXT_MUTED

    col2 = add_card(s12, Inches(6.75), Inches(1.9), Inches(5.75), Inches(4.9), "Conclusion & Q&A", border_color=ACCENT_INDIGO)
    c2_box = s12.shapes.add_textbox(Inches(7.0), Inches(2.6), Inches(5.25), Inches(4.0))
    tf2 = c2_box.text_frame
    tf2.word_wrap = True
    c_pts = [
        ("Complete Academic Solution", "CampusTrack bridges the gap between students, educators, and institutional leadership with unmatched clarity and performance."),
        ("Production-Ready Architecture", "Built with lightweight, scalable technologies: Python Flask, MongoDB, and modern reactive client engineering."),
        ("Observability & Hardware Telemetry", "Pioneers real-time system telemetry and simulation inside higher education software."),
        ("Live Demonstration Available", "Available immediately at http://localhost:5050 with ready demo profiles for immediate interactive evaluation.")
    ]
    for c_title, c_desc in c_pts:
        p = tf2.add_paragraph()
        p.text = f"★  {c_title}"
        p.font.size = Pt(12)
        p.font.bold = True
        p.font.color.rgb = ACCENT_INDIGO
        p.space_before = Pt(6)
        p_sub = tf2.add_paragraph()
        p_sub.text = c_desc
        p_sub.font.size = Pt(10.5)
        p_sub.font.color.rgb = TEXT_MUTED

    prs.save(output_path)
    print(f"Presentation successfully saved to: {output_path}")

if __name__ == "__main__":
    out_file = sys.argv[1] if len(sys.argv) > 1 else "CampusTrack_Presentation.pptx"
    build_presentation(out_file)
