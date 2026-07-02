# ============================================================
# STUDYHUB — Flask REST API
# Entry point : python app.py
# ============================================================

import os
from flask import Flask, send_from_directory
from flask_cors import CORS
from config import Config
from database import db
from routes.auth      import auth_bp
from routes.users     import users_bp
from routes.years     import years_bp
from routes.subjects  import subjects_bp
from routes.videos    import videos_bp
from routes.documents import documents_bp
from routes.progress  import progress_bp
from routes.admin     import admin_bp

# Paths to local upload folders (relative to this file → ../project/assets/...)
BASE_DIR        = os.path.dirname(__file__)
VIDEOS_FOLDER   = os.path.join(BASE_DIR, '..', 'project', 'assets', 'videos')
DOCUMENTS_FOLDER= os.path.join(BASE_DIR, '..', 'project', 'assets', 'documents')

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500 MB max upload

    # CORS
    CORS(app,
         resources={r"/api/*": {"origins": "*"}},
         supports_credentials=False,
         allow_headers=["Content-Type", "X-Session-Token"],
         expose_headers=["X-Session-Token"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"])

    @app.after_request
    def add_cors_headers(response):
        response.headers["Access-Control-Allow-Origin"]  = "*"
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, X-Session-Token"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
        return response

    # ── Serve uploaded files statically ──
    @app.route('/uploads/videos/<path:filename>')
    def serve_video(filename):
        folder = os.path.abspath(VIDEOS_FOLDER)
        os.makedirs(folder, exist_ok=True)
        return send_from_directory(folder, filename)

    @app.route('/uploads/documents/<path:filename>')
    def serve_document(filename):
        folder = os.path.abspath(DOCUMENTS_FOLDER)
        os.makedirs(folder, exist_ok=True)
        return send_from_directory(folder, filename)

    # Init SQLAlchemy
    db.init_app(app)

    # Register blueprints
    app.register_blueprint(auth_bp,      url_prefix='/api/auth')
    app.register_blueprint(users_bp,     url_prefix='/api/users')
    app.register_blueprint(years_bp,     url_prefix='/api/years')
    app.register_blueprint(subjects_bp,  url_prefix='/api/subjects')
    app.register_blueprint(videos_bp,    url_prefix='/api/videos')
    app.register_blueprint(documents_bp, url_prefix='/api/documents')
    app.register_blueprint(progress_bp,  url_prefix='/api/progress')
    app.register_blueprint(admin_bp,     url_prefix='/api/admin')

    with app.app_context():
        db.create_all()
        seed_data()

    return app

def seed_data():
    from models import Role, User, Year, Subject
    from werkzeug.security import generate_password_hash

    if not Role.query.first():
        db.session.add_all([Role(name='user'), Role(name='admin')])
        db.session.commit()

    if not User.query.filter_by(email='admin@platform.com').first():
        admin_role = Role.query.filter_by(name='admin').first()
        db.session.add(User(
            username='Administrateur',
            email='admin@platform.com',
            password=generate_password_hash('admin123'),
            role_id=admin_role.id
        ))
        db.session.commit()

    if not Year.query.first():
        db.session.add_all([
            Year(label='1ère Année',   icon='🌱', description='Bases fondamentales.', color='#10b981', sort_order=1),
            Year(label='2ème Année',   icon='📚', description='Approfondissement des connaissances.', color='#3b82f6', sort_order=2),
            Year(label='3ème Année',   icon='🔬', description='Matières avancées.', color='#8b5cf6', sort_order=3),
            Year(label='Baccalauréat', icon='🎓', description='Révision complète pour le bac.', color='#f59e0b', sort_order=4),
        ])
        db.session.commit()

    if not Subject.query.first():
        years = {y.sort_order: y.id for y in Year.query.all()}
        db.session.add_all([
            Subject(year_id=years[1], name='Mathématiques',      icon='📐', color='#3b82f6'),
            Subject(year_id=years[1], name='Physique-Chimie',    icon='⚗️', color='#8b5cf6'),
            Subject(year_id=years[1], name='Français',           icon='✍️', color='#10b981'),
            Subject(year_id=years[2], name='Mathématiques',      icon='📐', color='#3b82f6'),
            Subject(year_id=years[2], name='Sciences de la Vie', icon='🧬', color='#10b981'),
            Subject(year_id=years[2], name='Histoire-Géo',       icon='🌍', color='#f59e0b'),
            Subject(year_id=years[3], name='Mathématiques',      icon='📐', color='#3b82f6'),
            Subject(year_id=years[3], name='Philosophie',        icon='🧠', color='#ec4899'),
            Subject(year_id=years[3], name='Anglais',            icon='🇬🇧', color='#14b8a6'),
            Subject(year_id=years[4], name='Mathématiques Bac',  icon='📐', color='#3b82f6'),
            Subject(year_id=years[4], name='Physique Bac',       icon='⚡', color='#f59e0b'),
            Subject(year_id=years[4], name='Arabe Bac',          icon='📖', color='#ef4444'),
        ])
        db.session.commit()

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)