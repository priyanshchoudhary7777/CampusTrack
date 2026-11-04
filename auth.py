import re
from flask import Blueprint, request, jsonify, session, current_app
from werkzeug.security import check_password_hash
from functools import wraps

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


def login_required(role=None):
    """Decorator: require an active session, optionally restricted to one role."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user = session.get("user")
            if not user:
                return jsonify({"error": "Not authenticated"}), 401
            if role and user["role"] != role:
                return jsonify({"error": "Forbidden"}), 403
            return fn(*args, **kwargs)
        return wrapper
    return decorator


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("erpId") or "").strip()
    password = data.get("password") or ""
    role = data.get("role")

    if role not in ("admin", "teacher", "student"):
        return jsonify({"error": "Invalid role"}), 400

    if not identifier:
        return jsonify({"error": "Email or ERP ID is required"}), 400

    db = current_app.db
    ident_lower = identifier.lower()
    escaped = re.escape(identifier)

    # Build multi-match query for email, erpId, roll number, or student ID
    or_clauses = [
        {"email": ident_lower},
        {"erpId": {"$regex": f"^{escaped}$", "$options": "i"}},
    ]

    # Handle dash-omitted formats (e.g. ERP101 vs ERP-101, ADM1001 vs ADM-1001, FAC1001 vs FAC-1001)
    clean_erp = re.sub(r"[^a-zA-Z0-9]", "", identifier).upper()
    if clean_erp:
        or_clauses.append({"erpId": {"$regex": f"^{re.escape(clean_erp)}$", "$options": "i"}})
        if clean_erp.startswith("ERP") and len(clean_erp) > 3:
            or_clauses.append({"erpId": f"ERP-{clean_erp[3:]}"})
        if clean_erp.startswith("FAC") and len(clean_erp) > 3:
            or_clauses.append({"erpId": f"FAC-{clean_erp[3:]}"})
        if clean_erp.startswith("ADM") and len(clean_erp) > 3:
            or_clauses.append({"erpId": f"ADM-{clean_erp[3:]}"})

    # Numeric roll number
    if identifier.isdigit():
        roll_num = int(identifier)
        or_clauses.append({"roll": roll_num})
        or_clauses.append({"erpId": f"ERP-{roll_num}"})

    if role == "student":
        or_clauses.append({"studentId": {"$regex": f"^{escaped}$", "$options": "i"}})

    user = db.users.find_one({"role": role, "$or": or_clauses})

    # Fallback: check db.students if student not yet matched
    if not user and role == "student":
        st_conditions = [
            {"_id": ident_lower},
            {"erpId": {"$regex": f"^{escaped}$", "$options": "i"}},
        ]
        if identifier.isdigit():
            st_conditions.append({"roll": int(identifier)})
            st_conditions.append({"erpId": f"ERP-{identifier}"})
        st = db.students.find_one({"$or": st_conditions})
        if st:
            user = db.users.find_one({"role": "student", "studentId": st["_id"]})

    if not user or not check_password_hash(user.get("passwordHash", ""), password):
        return jsonify({"error": "Invalid email/ERP ID or password for this role."}), 401

    session["user"] = {
        "email": user.get("email"),
        "erpId": user.get("erpId") or (f"ERP-{user.get('roll')}" if user.get("roll") else user.get("studentId")),
        "role": user["role"],
        "name": user["name"],
        "studentId": user.get("studentId"),
        "roll": user.get("roll"),
    }
    return jsonify(session["user"])


@auth_bp.post("/logout")
def logout():
    session.pop("user", None)
    return jsonify({"ok": True})


@auth_bp.get("/me")
def me():
    user = session.get("user")
    if not user:
        return jsonify({"error": "Not authenticated"}), 401
    return jsonify(user)
