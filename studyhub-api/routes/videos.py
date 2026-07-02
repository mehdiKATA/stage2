# routes/videos.py
import os, uuid
from flask import Blueprint, request, send_from_directory, current_app
from database import db
from models import Video
from helpers import success, error, admin_required

videos_bp = Blueprint('videos', __name__)

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), '..', 'project', 'assets', 'videos')
ALLOWED_EXTENSIONS = {'mp4', 'avi', 'mkv', 'mov', 'webm', 'flv', 'wmv', 'mpeg', 'mpg', 'm4v'}

def allowed_video(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@videos_bp.route('/', methods=['GET'])
def get_videos():
    subject_id = request.args.get('subject_id', type=int)
    if not subject_id:
        return error('subject_id requis.')
    videos = Video.query.filter_by(subject_id=subject_id, is_active=True)\
                        .order_by(Video.sort_order).all()
    return success([v.to_dict() for v in videos])

@videos_bp.route('/upload', methods=['POST'])
@admin_required
def upload_video():
    if 'file' not in request.files:
        return error('Fichier requis.')
    file       = request.files['file']
    title      = request.form.get('title', '').strip()
    subject_id = request.form.get('subject_id', type=int)
    duration   = request.form.get('duration', '00:00')

    if not file or not title or not subject_id:
        return error('title, subject_id et fichier requis.')
    if not allowed_video(file.filename):
        return error('Format vidéo non supporté.')

    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext      = file.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOAD_FOLDER, filename))

    # URL accessible depuis le frontend via http://127.0.0.1:5000/uploads/videos/<filename>
    url = f"/uploads/videos/{filename}"
    video = Video(title=title, url=url, subject_id=subject_id, duration=duration)
    db.session.add(video)
    db.session.commit()
    return success(video.to_dict(), 'Vidéo ajoutée.', 201)

@videos_bp.route('/', methods=['POST'])
@admin_required
def add_video():
    data = request.get_json()
    title      = (data.get('title') or '').strip()
    url        = (data.get('url')   or '').strip()
    subject_id =  data.get('subject_id')
    duration   =  data.get('duration', '00:00')
    if not title or not url or not subject_id:
        return error('title, url et subject_id requis.')
    video = Video(title=title, url=url, subject_id=subject_id, duration=duration)
    db.session.add(video)
    db.session.commit()
    return success(video.to_dict(), 'Vidéo ajoutée.', 201)

@videos_bp.route('/<int:video_id>', methods=['DELETE'])
@admin_required
def delete_video(video_id):
    video = Video.query.get_or_404(video_id)
    # Supprimer le fichier local si c'est un upload
    if video.url and video.url.startswith('/uploads/videos/'):
        filepath = os.path.join(UPLOAD_FOLDER, video.url.split('/')[-1])
        if os.path.exists(filepath):
            os.remove(filepath)
    video.is_active = False
    db.session.commit()
    return success(None, 'Vidéo supprimée.')