from flask import Blueprint, request, g
from database import db
from models import User, Subject, Video, Document, Year, UserVideoProgress
from helpers import success, error, admin_required

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    return success({
        'total_users':    User.query.count(),
        'total_subjects': Subject.query.filter_by(is_active=True).count(),
        'total_videos':   Video.query.filter_by(is_active=True).count(),
        'total_docs':     Document.query.filter_by(is_active=True).count(),
        'total_watches':  UserVideoProgress.query.count(),
    })

@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    users = User.query.order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        d = u.to_dict()
        d['watched_count'] = len(u.video_progress)
        result.append(d)
    return success(result)

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@admin_required
def delete_user(user_id):
    user = User.query.get_or_404(user_id)
    if user.role.name == 'admin':
        return error('Impossible de supprimer un administrateur.')
    db.session.delete(user)
    db.session.commit()
    return success(None, 'Utilisateur supprimé.')

@admin_bp.route('/subjects', methods=['POST'])
@admin_required
def add_subject():
    data    = request.get_json() or {}
    name    = data.get('name', '').strip()
    year_id = data.get('year_id')
    icon    = data.get('icon', '📚')
    color   = data.get('color', '#3b82f6')
    if not name or not year_id:
        return error('name et year_id requis.')
    subj = Subject(name=name, year_id=year_id, icon=icon, color=color)
    db.session.add(subj)
    db.session.commit()
    return success(subj.to_dict(), 'Matière ajoutée.', 201)

@admin_bp.route('/subjects/<int:subject_id>', methods=['DELETE'])
@admin_required
def delete_subject(subject_id):
    subj = Subject.query.get_or_404(subject_id)
    subj.is_active = False
    db.session.commit()
    return success(None, 'Matière désactivée.')
