import os
from flask import Flask, send_from_directory
from config import Config
from extensions import init_db
from auth import auth_bp
from routes_admin import admin_bp
from routes_teacher import teacher_bp
from routes_student import student_bp
from routes_monitor import monitor_bp


def create_app():
    app = Flask(__name__, static_folder="static", static_url_path="")
    app.config.from_object(Config)
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
    init_db(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(monitor_bp)

    @app.after_request
    def add_no_cache_headers(response):
        if "text/html" in response.headers.get("Content-Type", "") or "javascript" in response.headers.get("Content-Type", "") or "css" in response.headers.get("Content-Type", ""):
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        return response

    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.get("/download")
    @app.get("/download.zip")
    @app.get("/campustrack.zip")
    def download_zip():
        base_dir = os.path.dirname(os.path.abspath(__file__))
        return send_from_directory(base_dir, "campustrack.zip", as_attachment=True)

    @app.get("/download/report")
    @app.get("/download/report.docx")
    @app.get("/download-report")
    def download_report():
        base_dir = os.path.dirname(os.path.abspath(__file__))
        return send_from_directory(base_dir, "NIET_PBL_Final_Report_CampusTrack.docx", as_attachment=True)

    @app.get("/download/ppt")
    @app.get("/download/ppt.pptx")
    @app.get("/download-ppt")
    def download_ppt():
        base_dir = os.path.dirname(os.path.abspath(__file__))
        return send_from_directory(base_dir, "CampusTrack_Presentation.pptx", as_attachment=True)

    @app.get("/download/md")
    @app.get("/download/report.md")
    def download_md():
        base_dir = os.path.dirname(os.path.abspath(__file__))
        return send_from_directory(base_dir, "NIET_PBL_Final_Report_CampusTrack.md", as_attachment=True)

    return app


app = create_app()

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5050))
    app.run(debug=True, host="127.0.0.1", port=port)
