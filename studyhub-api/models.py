# ============================================================
# models.py — SQLAlchemy ORM Models (MVC: Model layer)
# Each class maps to one MySQL table
# ============================================================
from database import db
from datetime import datetime

class Role(db.Model):
    __tablename__ = 'roles'
    id         = db.Column(db.SmallInteger, primary_key=True, autoincrement=True)
    name       = db.Column(db.String(20), unique=True, nullable=False)  # 'user' | 'admin'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    users      = db.relationship('User', backref='role', lazy=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name}


class User(db.Model):
    __tablename__ = 'users'
    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    username   = db.Column(db.String(60), nullable=False)
    email      = db.Column(db.String(120), unique=True, nullable=False)
    password   = db.Column(db.String(255), nullable=False)  # bcrypt hash
    role_id    = db.Column(db.SmallInteger, db.ForeignKey('roles.id'), default=1)
    avatar_url = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    video_progress   = db.relationship('UserVideoProgress',   backref='user', lazy=True, cascade='all, delete')
    subject_progress = db.relationship('UserSubjectProgress', backref='user', lazy=True, cascade='all, delete')
    achievements     = db.relationship('UserAchievement',     backref='user', lazy=True, cascade='all, delete')

    def to_dict(self, include_private=False):
        data = {
            'id':         self.id,
            'username':   self.username,
            'email':      self.email,
            'role':       self.role.name if self.role else 'user',
            'avatar_url': self.avatar_url,
            'created_at': self.created_at.isoformat(),
        }
        return data


class Year(db.Model):
    __tablename__ = 'years'
    id          = db.Column(db.SmallInteger, primary_key=True, autoincrement=True)
    label       = db.Column(db.String(50), nullable=False)
    icon        = db.Column(db.String(10), nullable=False)
    description = db.Column(db.Text, nullable=True)
    color       = db.Column(db.String(10), default='#f59e0b')
    sort_order  = db.Column(db.SmallInteger, default=0)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    subjects    = db.relationship('Subject', backref='year', lazy=True, cascade='all, delete')

    def to_dict(self):
        return {
            'id': self.id, 'label': self.label, 'icon': self.icon,
            'description': self.description, 'color': self.color,
            'sort_order': self.sort_order
        }


class Subject(db.Model):
    __tablename__ = 'subjects'
    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    year_id     = db.Column(db.SmallInteger, db.ForeignKey('years.id'), nullable=False)
    name        = db.Column(db.String(100), nullable=False)
    icon        = db.Column(db.String(10), nullable=False)
    color       = db.Column(db.String(10), default='#3b82f6')
    description = db.Column(db.Text, nullable=True)
    is_active   = db.Column(db.Boolean, default=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    videos      = db.relationship('Video',    backref='subject', lazy=True, cascade='all, delete')
    documents   = db.relationship('Document', backref='subject', lazy=True, cascade='all, delete')

    def to_dict(self, with_counts=False):
        data = {
            'id': self.id, 'year_id': self.year_id, 'name': self.name,
            'icon': self.icon, 'color': self.color,
            'description': self.description, 'is_active': self.is_active
        }
        if with_counts:
            data['video_count'] = len([v for v in self.videos if v.is_active])
            data['doc_count']   = len([d for d in self.documents if d.is_active])
        return data


class Video(db.Model):
    __tablename__ = 'videos'
    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subject_id  = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    title       = db.Column(db.String(200), nullable=False)
    url         = db.Column(db.String(500), nullable=False)
    duration    = db.Column(db.String(10), default='00:00')
    thumbnail   = db.Column(db.String(500), nullable=True)
    sort_order  = db.Column(db.SmallInteger, default=0)
    is_active   = db.Column(db.Boolean, default=True)
    created_by  = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at  = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at  = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'subject_id': self.subject_id,
            'title': self.title, 'url': self.url,
            'duration': self.duration, 'thumbnail': self.thumbnail,
            'sort_order': self.sort_order
        }


class Document(db.Model):
    __tablename__ = 'documents'
    id              = db.Column(db.Integer, primary_key=True, autoincrement=True)
    subject_id      = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    name            = db.Column(db.String(200), nullable=False)
    url             = db.Column(db.String(500), nullable=False)
    file_size       = db.Column(db.String(20), nullable=True)
    is_downloadable = db.Column(db.Boolean, default=False)
    sort_order      = db.Column(db.SmallInteger, default=0)
    is_active       = db.Column(db.Boolean, default=True)
    created_by      = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at      = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'subject_id': self.subject_id,
            'name': self.name, 'url': self.url,
            'file_size': self.file_size,
            'is_downloadable': self.is_downloadable,
            'sort_order': self.sort_order
        }


class UserVideoProgress(db.Model):
    __tablename__ = 'user_video_progress'
    id          = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id     = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    video_id    = db.Column(db.Integer, db.ForeignKey('videos.id'), nullable=False)
    watched_at  = db.Column(db.DateTime, default=datetime.utcnow)
    watch_count = db.Column(db.SmallInteger, default=1)
    __table_args__ = (db.UniqueConstraint('user_id', 'video_id'),)

    def to_dict(self):
        return {'video_id': self.video_id, 'watch_count': self.watch_count,
                'watched_at': self.watched_at.isoformat()}


class UserSubjectProgress(db.Model):
    __tablename__ = 'user_subject_progress'
    id         = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id    = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    progress   = db.Column(db.SmallInteger, default=0)  # 0-100
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    __table_args__ = (db.UniqueConstraint('user_id', 'subject_id'),)

    def to_dict(self):
        return {'subject_id': self.subject_id, 'progress': self.progress}


class Achievement(db.Model):
    __tablename__ = 'achievements'
    id              = db.Column(db.SmallInteger, primary_key=True, autoincrement=True)
    code            = db.Column(db.String(50), unique=True, nullable=False)
    name            = db.Column(db.String(100), nullable=False)
    description     = db.Column(db.String(255))
    icon            = db.Column(db.String(10))
    condition_type  = db.Column(db.String(50))
    condition_value = db.Column(db.Integer, default=1)

    def to_dict(self):
        return {'id': self.id, 'code': self.code, 'name': self.name,
                'description': self.description, 'icon': self.icon}


class UserAchievement(db.Model):
    __tablename__ = 'user_achievements'
    id             = db.Column(db.Integer, primary_key=True, autoincrement=True)
    user_id        = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    achievement_id = db.Column(db.SmallInteger, db.ForeignKey('achievements.id'), nullable=False)
    earned_at      = db.Column(db.DateTime, default=datetime.utcnow)
    achievement    = db.relationship('Achievement')
    __table_args__ = (db.UniqueConstraint('user_id', 'achievement_id'),)

    def to_dict(self):
        return {'achievement_id': self.achievement_id,
                'earned_at': self.earned_at.isoformat(),
                'achievement': self.achievement.to_dict() if self.achievement else None}
