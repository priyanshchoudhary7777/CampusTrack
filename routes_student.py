from flask import Blueprint, jsonify, session, current_app
from auth import login_required
from utils import overall_stats, subject_stats, get_required_pct

student_bp = Blueprint("student", __name__, url_prefix="/api/student")


@student_bp.get("/dashboard")
@login_required("student")
def dashboard():
    db = current_app.db
    sid = session["user"]["studentId"]
    overall = overall_stats(db, sid)
    subjects = list(db.subjects.find({}))
    per_subject = [
        {"id": s["_id"], "name": s["name"], **subject_stats(db, s["_id"], sid)}
        for s in subjects
    ]
    return jsonify({"overall": overall, "subjects": per_subject})


@student_bp.get("/subjects")
@login_required("student")
def subjects_detail():
    db = current_app.db
    sid = session["user"]["studentId"]
    subjects = list(db.subjects.find({}))
    return jsonify({
        "requiredPct": get_required_pct(db),
        "subjects": [
            {"id": s["_id"], "name": s["name"], **subject_stats(db, s["_id"], sid)}
            for s in subjects
        ],
    })
