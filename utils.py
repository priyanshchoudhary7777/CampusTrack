"""Core attendance math, ported 1:1 from the original client-side logic,
now running server-side against MongoDB data."""

COLLEGE_START = "09:00"
COLLEGE_END = "17:00"
LUNCH_START = "12:30"
LUNCH_END = "13:30"


def _to_minutes(value):
    value = (value or "00:00").strip()
    if not value:
        return 0
    try:
        hour, minute = value.split(":")
        return int(hour) * 60 + int(minute)
    except ValueError:
        return 0


def is_valid_lecture_window(start_time, end_time):
    start_minutes = _to_minutes(start_time)
    end_minutes = _to_minutes(end_time)
    lunch_start = _to_minutes(LUNCH_START)
    lunch_end = _to_minutes(LUNCH_END)
    college_start = _to_minutes(COLLEGE_START)
    college_end = _to_minutes(COLLEGE_END)

    if not start_time or not end_time:
        return False
    if start_minutes < college_start or end_minutes > college_end:
        return False
    if end_minutes <= start_minutes:
        return False
    if start_minutes < lunch_end and end_minutes > lunch_start:
        return False
    return True


def calc(present, total, required_pct):
    """Given present/total classes and the required percentage, return the
    same eligibility breakdown the original app showed the student."""
    if total == 0:
        return {
            "present": present, "total": total,
            "currentPercentage": 0, "requiredPercentage": required_pct,
            "isEligible": False, "classesNeededToReachRequired": 0,
            "classesCanMiss": 0, "status": "NO_DATA",
        }

    pct = (present / total) * 100

    needed = 0
    if pct < required_pct:
        x = 0
        while ((present + x) / (total + x)) * 100 < required_pct and x < 100000:
            x += 1
        needed = x

    can_miss = 0
    if pct >= required_pct:
        x = 0
        while total + x + 1 > 0 and (present / (total + x + 1)) * 100 >= required_pct and x < 100000:
            x += 1
        can_miss = x

    return {
        "present": present, "total": total,
        "currentPercentage": round(pct, 2), "requiredPercentage": required_pct,
        "isEligible": pct >= required_pct,
        "classesNeededToReachRequired": needed,
        "classesCanMiss": can_miss,
        "status": "ELIGIBLE" if pct >= required_pct else "BELOW_REQUIREMENT",
    }


def get_required_pct(db):
    doc = db.settings.find_one({"_id": "config"})
    return doc["requiredPct"] if doc else 75


def attendance_history(db, subject_id, student_id):
    recs = list(db.attendance.find({"subjectId": subject_id, "studentId": student_id}))
    normalized = []
    for row in recs:
        start_time = row.get("startTime") or "09:00"
        end_time = row.get("endTime") or "10:00"
        normalized.append({
            "date": row.get("date"),
            "startTime": start_time,
            "endTime": end_time,
            "status": row.get("status", "ABSENT"),
            "label": f"{start_time} - {end_time}",
        })
    normalized.sort(key=lambda item: (item["date"] or "", item["startTime"] or "00:00"), reverse=True)
    return normalized


def subject_stats(db, subject_id, student_id):
    recs = list(db.attendance.find({"subjectId": subject_id, "studentId": student_id}))
    present = sum(1 for r in recs if r["status"] == "PRESENT")
    total = len(recs)
    pct = round((present / total) * 100, 1) if total else 0
    return {"present": present, "total": total, "pct": pct, "history": attendance_history(db, subject_id, student_id)}


def overall_stats(db, student_id):
    """Overall attendance across ALL subjects — this alone drives eligibility."""
    recs = list(db.attendance.find({"studentId": student_id}))
    present = sum(1 for r in recs if r["status"] == "PRESENT")
    total = len(recs)
    return calc(present, total, get_required_pct(db))
