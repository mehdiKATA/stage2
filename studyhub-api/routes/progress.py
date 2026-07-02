from flask import Blueprint, request, g
from database import db
from models import UserVideoProgress, UserSubjectProgress, Video, UserAchievement, Achievement
from helpers import success, error, login_required

progress_bp = Blueprint('progress', __name__)

@progress_bp.route('/watch', methods=['POST'])
@login_required
def watch_video():
    user_id  = g.user_id
    video_id = (request.get_json() or {}).get('video_id')
    if not video_id:
        return error('video_id requis.')
    video = Video.query.get_or_404(video_id)
    existing = UserVideoProgress.query.filter_by(user_id=user_id, video_id=video_id).first()
    if existing:
        existing.watch_count += 1
    else:
        db.session.add(UserVideoProgress(user_id=user_id, video_id=video_id))
    db.session.flush()
    _recalc_progress(user_id, video.subject_id)
    db.session.commit()
    new_achievements = _check_achievements(user_id)
    return success({'achievements': new_achievements}, 'Progression mise à jour.')

@progress_bp.route('/me', methods=['GET'])
@login_required
def my_progress():
    user_id = g.user_id
    watched      = UserVideoProgress.query.filter_by(user_id=user_id).all()
    subject_prog = UserSubjectProgress.query.filter_by(user_id=user_id).all()
    earned       = UserAchievement.query.filter_by(user_id=user_id).all()
    return success({
        'watched_videos':   [w.to_dict() for w in watched],
        'subject_progress': [s.to_dict() for s in subject_prog],
        'achievements':     [a.to_dict() for a in earned],
    })

@progress_bp.route('/reset', methods=['DELETE'])
@login_required
def reset_progress():
    user_id = g.user_id
    UserVideoProgress.query.filter_by(user_id=user_id).delete()
    UserSubjectProgress.query.filter_by(user_id=user_id).delete()
    UserAchievement.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return success(None, 'Progression réinitialisée.')

def _recalc_progress(user_id, subject_id):
    total   = Video.query.filter_by(subject_id=subject_id, is_active=True).count()
    watched = (db.session.query(UserVideoProgress)
               .join(Video, UserVideoProgress.video_id == Video.id)
               .filter(UserVideoProgress.user_id == user_id, Video.subject_id == subject_id)
               .count())
    pct = round((watched / total) * 100) if total > 0 else 0
    existing = UserSubjectProgress.query.filter_by(user_id=user_id, subject_id=subject_id).first()
    if existing:
        existing.progress = pct
    else:
        db.session.add(UserSubjectProgress(user_id=user_id, subject_id=subject_id, progress=pct))

def _check_achievements(user_id):
    earned_ids     = {a.achievement_id for a in UserAchievement.query.filter_by(user_id=user_id).all()}
    total_watched  = UserVideoProgress.query.filter_by(user_id=user_id).count()
    subjects_count = UserSubjectProgress.query.filter_by(user_id=user_id).count()
    newly_earned   = []
    for a in Achievement.query.all():
        if a.id in earned_ids:
            continue
        unlocked = False
        if a.condition_type == 'videos_watched'   and total_watched  >= a.condition_value: unlocked = True
        if a.condition_type == 'subjects_visited' and subjects_count >= a.condition_value: unlocked = True
        if a.condition_type == 'progress':
            if UserSubjectProgress.query.filter(UserSubjectProgress.user_id==user_id, UserSubjectProgress.progress>0).first():
                unlocked = True
        if unlocked:
            db.session.add(UserAchievement(user_id=user_id, achievement_id=a.id))
            newly_earned.append(a.to_dict())
    return newly_earned
