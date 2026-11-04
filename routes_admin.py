from flask import Blueprint, request, jsonify, current_app
from auth import login_required
from utils import overall_stats, get_required_pct

admin_bp = Blueprint("admin", __name__, url_prefix="/api/admin")


@admin_bp.get("/dashboard")
@login_required("admin")
def dashboard():
    db = current_app.db
    students = list(db.students.find({}))
    subjects = list(db.subjects.find({}))

    total_present, total_all, below = 0, 0, 0
    rows = []
    for st in students:
        o = overall_stats(db, st["_id"])
        total_present += o["present"]
        total_all += o["total"]
        if not o["isEligible"]:
            below += 1
        rows.append({
            "roll": st["roll"],
            "erpId": st.get("erpId", f"ERP-{st['roll']}"),
            "name": st["name"],
            "currentPercentage": o["currentPercentage"],
            "isEligible": o["isEligible"],
        })

    avg = round((total_present / total_all) * 100, 2) if total_all else 0
    teachers = {s["teacher"] for s in subjects}

    return jsonify({
        "totalStudents": len(students),
        "totalTeachers": len(teachers),
        "totalSubjects": len(subjects),
        "averageAttendance": avg,
        "belowRequirement": below,
        "requiredPct": get_required_pct(db),
        "students": sorted(rows, key=lambda r: r["roll"]),
    })


@admin_bp.get("/settings")
@login_required("admin")
def get_settings():
    db = current_app.db
    return jsonify({"requiredPct": get_required_pct(db)})


@admin_bp.post("/settings")
@login_required("admin")
def update_settings():
    data = request.get_json(silent=True) or {}
    value = data.get("requiredPct")
    if not isinstance(value, (int, float)) or not (0 < value <= 100):
        return jsonify({"error": "requiredPct must be between 1 and 100"}), 400

    db = current_app.db
    db.settings.update_one({"_id": "config"}, {"$set": {"requiredPct": value}}, upsert=True)
    return jsonify({"requiredPct": value})
