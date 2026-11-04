from pymongo import MongoClient

mongo_client = None
db = None


def ensure_erp_ids(database):
    """Ensure all students and users have an erpId assigned."""
    try:
        # Ensure students have erpId
        for st in database.students.find():
            roll = st.get("roll", 100)
            erp_id = st.get("erpId") or f"ERP-{roll}"
            database.students.update_one(
                {"_id": st["_id"]},
                {"$set": {"erpId": erp_id}}
            )

        # Map teacher emails to standard ERP codes
        teacher_codes = {
            "teacher1@college.com": "FAC-1001",
            "teacher2@college.com": "FAC-1002",
        }

        # Ensure users have erpId and roll
        for user in database.users.find():
            role = user.get("role")
            email = user.get("email", "")
            current_erp = user.get("erpId")
            updates = {}

            if role == "admin" and not current_erp:
                updates["erpId"] = "ADM-1001"
            elif role == "teacher" and not current_erp:
                updates["erpId"] = teacher_codes.get(email, f"FAC-{str(user['_id'])[-4:]}")
            elif role == "student":
                sid = user.get("studentId")
                st = database.students.find_one({"_id": sid}) if sid else None
                if not st and "roll" in user:
                    st = database.students.find_one({"roll": user["roll"]})
                if st:
                    roll = st.get("roll")
                    updates["erpId"] = st.get("erpId", f"ERP-{roll}")
                    updates["roll"] = roll
                elif not current_erp:
                    updates["erpId"] = "ERP-101"

            if updates:
                database.users.update_one({"_id": user["_id"]}, {"$set": updates})
    except Exception as exc:
        print("[ensure_erp_ids warning]", exc)


def init_db(app):
    """Initialize the MongoDB connection and attach it to the app + module globals."""
    global mongo_client, db
    mongo_client = MongoClient(app.config["MONGO_URI"])
    db = mongo_client[app.config["MONGO_DB_NAME"]]
    app.db = db
    ensure_erp_ids(db)
    return db
