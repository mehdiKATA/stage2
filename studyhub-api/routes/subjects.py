# routes/subjects.py — GET /api/subjects?year_id=1, /api/subjects/<id>
from flask import Blueprint, request
from models import Subject
from helpers import success, error

subjects_bp = Blueprint('subjects', __name__)

@subjects_bp.route('/', methods=['GET'])
def get_subjects():
    year_id = request.args.get('year_id', type=int)
    query = Subject.query.filter_by(is_active=True)
    if year_id:
        query = query.filter_by(year_id=year_id)
    subjects = query.all()
    return success([s.to_dict(with_counts=True) for s in subjects])

@subjects_bp.route('/<int:subject_id>', methods=['GET'])
def get_subject(subject_id):
    subject = Subject.query.get_or_404(subject_id)
    return success(subject.to_dict(with_counts=True))
