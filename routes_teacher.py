from flask import Blueprint, request, jsonify, session, current_app
from auth import login_required
from utils import is_valid_lecture_window

teacher_bp = Blueprint("teacher", __name__, url_prefix="/api/teacher")


@teacher_bp.get("/subjects")
@login_required("teacher")
def my_subjects():
    db = current_app.db
    name = session["user"]["name"]
    subjects = list(db.subjects.find({"teacher": name}))
    student_count = db.students.count_documents({})
    return jsonify([
        {
            "id": s["_id"],
            "name": s["name"],
            "studentCount": student_count,
            "startTime": s.get("startTime", "09:00"),
            "endTime": s.get("endTime", "10:00"),
        }
        for s in subjects
    ])


@teacher_bp.get("/students")
@login_required("teacher")
def student_roster():
    db = current_app.db
    students = list(db.students.find({}).sort("roll", 1))
    return jsonify([
        {
            "id": s["_id"],
            "roll": s["roll"],
            "erpId": s.get("erpId", f"ERP-{s['roll']}"),
            "name": s["name"]
        }
        for s in students
    ])


@teacher_bp.post("/attendance")
@login_required("teacher")
def submit_attendance():
    data = request.get_json(silent=True) or {}
    subject_id = data.get("subjectId")
    date = data.get("date")
    start_time = data.get("startTime")
    end_time = data.get("endTime")
    records = data.get("records") or []

    db = current_app.db
    subject = db.subjects.find_one({"_id": subject_id, "teacher": session["user"]["name"]})
    if not subject:
        return jsonify({"error": "Subject not found or not yours"}), 404

    if not start_time:
        start_time = subject.get("startTime", "09:00")
    if not end_time:
        end_time = subject.get("endTime", "10:00")

    if not subject_id or not date or not records:
        return jsonify({"error": "subjectId, date and records are required"}), 400

    if not is_valid_lecture_window(start_time, end_time):
        return jsonify({"error": "Lecture time must be between 09:00 and 17:00 and cannot overlap the 12:30-13:30 lunch break."}), 400

    if db.attendance.find_one({"subjectId": subject_id, "date": date, "startTime": start_time, "endTime": end_time}):
        return jsonify({"error": "Attendance for this subject/date/time already exists."}), 409

    docs = [
        {
            "subjectId": subject_id,
            "studentId": r["studentId"],
            "date": date,
            "startTime": start_time,
            "endTime": end_time,
            "status": r["status"],
        }
        for r in records if r.get("status") in ("PRESENT", "ABSENT")
    ]
    if docs:
        db.attendance.insert_many(docs)

    return jsonify({"ok": True, "inserted": len(docs), "lecture": {"date": date, "startTime": start_time, "endTime": end_time}})
