"""Run this once to populate MongoDB with the same demo data the original
CampusTrack prototype used: 8 students, 3 subjects, 24 days of attendance
per subject per student, and a 75% requirement.

Usage:
    python seed.py
"""
import random
from werkzeug.security import generate_password_hash
from pymongo import MongoClient
from config import Config

client = MongoClient(Config.MONGO_URI)
db = client[Config.MONGO_DB_NAME]

STUDENT_NAMES = [
    "Rahul Sharma", "Priya Singh", "Aman Kumar", "Rohit Verma", "Neha Gupta",
    "Karan Mehta", "Sneha Yadav", "Vikram Rao", "Ananya Patel", "Harsh Joshi",
    "Divya Nair", "Aditya Iyer", "Meera Reddy", "Yash Malhotra", "Pooja Desai",
    "Kunal Shah", "Sara Khan", "Rohan Gupta", "Tanya Mishra", "Nikhil Sen",
    "Ishita Chawla", "Aarav Kapoor", "Shreya Bansal", "Vedant Singh", "Mitali Jain",
    "Dev Khanna", "Aisha Ali", "Pranav Das", "Kavya Menon", "Siddharth Roy",
    "Ritika Nanda", "Manav Sethi", "Anjali Verma", "Kabir Arora", "Vaishnavi Rao",
    "Dhruv Agarwal", "Nisha Fernandes", "Samarth Kulkarni", "Esha Bose", "Aryan Goel",
    "Tanvi Shah", "Mohit Sinha", "Swati Mishra", "Saurabh Pandey", "Pallavi Nair",
    "Vansh Kapoor", "Aditi Mehta", "Raghav Sharma", "Sakshi Khanna", "Yuvraj Singh"
]

STUDENTS = [
    {
        "_id": f"st{i}",
        "name": STUDENT_NAMES[i - 1],
        "roll": 100 + i,
        "erpId": f"ERP-{100 + i}",
        "email": f"student{i:02d}@college.com",
    }
    for i in range(1, 51)
]

SUBJECTS = [
    {"_id": "s1", "name": "Java Programming", "teacher": "Teacher A", "startTime": "09:00", "endTime": "10:00"},
    {"_id": "s2", "name": "DBMS", "teacher": "Teacher B", "startTime": "10:15", "endTime": "11:15"},
    {"_id": "s3", "name": "Operating Systems", "teacher": "Teacher A", "startTime": "11:30", "endTime": "12:30"},
    {"_id": "s4", "name": "DSA", "teacher": "Teacher B", "startTime": "14:00", "endTime": "15:00"},
    {"_id": "s5", "name": "CAPP", "teacher": "Teacher A", "startTime": "15:15", "endTime": "16:15"},
    {"_id": "s6", "name": "Technical Communication", "teacher": "Teacher B", "startTime": "09:30", "endTime": "10:30"},
    {"_id": "s7", "name": "DSA - 2", "teacher": "Teacher B", "startTime": "13:45", "endTime": "14:45"},
    {"_id": "s8", "name": "AI & Ethics", "teacher": "Teacher A", "startTime": "16:00", "endTime": "17:00"},
]

# Per-student attendance bias so overall percentages vary realistically
# Scales to all seeded students instead of only the original 8 accounts.
BIAS = {
    student["_id"]: 0.55 + (0.4 * ((index + 1) / len(STUDENTS)))
    for index, student in enumerate(STUDENTS)
}
DAYS = 24


def run():
    db.students.delete_many({})
    db.subjects.delete_many({})
    db.attendance.delete_many({})
    db.users.delete_many({})
    db.settings.delete_many({})

    db.students.insert_many(STUDENTS)
    db.subjects.insert_many(SUBJECTS)
    db.settings.insert_one({"_id": "config", "requiredPct": 75})

    def hash_password(password: str) -> str:
        return generate_password_hash(password, method="pbkdf2:sha256")

    users = [
        {"email": "admin@college.com", "erpId": "ADM-1001", "passwordHash": hash_password("admin123"),
         "role": "admin", "name": "Admin"},
        {"email": "teacher1@college.com", "erpId": "FAC-1001", "passwordHash": hash_password("teach123"),
         "role": "teacher", "name": "Teacher A"},
        {"email": "teacher2@college.com", "erpId": "FAC-1002", "passwordHash": hash_password("teach123"),
         "role": "teacher", "name": "Teacher B"},
    ]
    for st in STUDENTS:
        users.append({
            "email": st["email"], "erpId": st["erpId"], "roll": st["roll"],
            "passwordHash": hash_password("stud123"),
            "role": "student", "name": st["name"], "studentId": st["_id"],
        })

    # Backward compatibility with the original demo emails used in older docs/UI.
    legacy_aliases = {
        "student1@college.com": "student01@college.com",
        "student2@college.com": "student02@college.com",
        "student3@college.com": "student03@college.com",
        "student4@college.com": "student04@college.com",
        "student5@college.com": "student05@college.com",
        "student6@college.com": "student06@college.com",
        "student7@college.com": "student07@college.com",
        "student8@college.com": "student08@college.com",
    }
    for alias, primary in legacy_aliases.items():
        if alias == primary:
            continue
        target = next((u for u in users if u["email"] == primary and u["role"] == "student"), None)
        if target:
            users.append({
                "email": alias,
                "erpId": target.get("erpId"),
                "roll": target.get("roll"),
                "passwordHash": target["passwordHash"],
                "role": "student",
                "name": target["name"],
                "studentId": target.get("studentId"),
            })

    db.users.insert_many(users)

    attendance_docs = []
    for sub in SUBJECTS:
        for st in STUDENTS:
            for day in range(1, DAYS + 1):
                present = random.random() < BIAS[st["_id"]]
                attendance_docs.append({
                    "subjectId": sub["_id"],
                    "studentId": st["_id"],
                    "date": f"2026-09-{day:02d}",
                    "status": "PRESENT" if present else "ABSENT",
                })
    db.attendance.insert_many(attendance_docs)

    print(f"Seeded {len(STUDENTS)} students, {len(SUBJECTS)} subjects, "
          f"{len(attendance_docs)} attendance records, {len(users)} users.")


if __name__ == "__main__":
    run()
